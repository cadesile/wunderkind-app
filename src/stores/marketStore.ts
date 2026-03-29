import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Agent,
  Investor,
  Sponsor,
  MarketData,
  MarketPlayer,
  MarketCoach,
  MarketScout,
} from '@/types/market';
import { zustandStorage } from '@/utils/storage';
import { marketApi } from '@/api/endpoints/market';
import { useCoachStore } from './coachStore';
import { useSquadStore } from './squadStore';
import { useScoutStore } from './scoutStore';
import { useAcademyStore } from './academyStore';
import { useGuardianStore } from './guardianStore';
import { getCoachPerception, getHeadCoach } from '@/engine/CoachPerception';
import { updateCoachRelationship } from '@/engine/RelationshipService';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import type { ApiGuardian } from '@/types/api';
import type { Guardian } from '@/types/guardian';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function calculateAgentOffer(baseValue: number): number {
  const roll = Math.random();
  if (roll < 0.70) {
    return Math.round(baseValue * (0.90 + Math.random() * 0.20));
  }
  const isCheap = Math.random() < 0.5;
  return Math.round(baseValue * (isCheap
    ? (0.40 + Math.random() * 0.20)
    : (1.40 + Math.random() * 0.20)));
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface MarketState {
  // ── Persisted data ────────────────────────────────────────────────────────
  players: MarketPlayer[];
  coaches: MarketCoach[];
  /** Market-available scouts (distinct from hired scouts in scoutStore) */
  marketScouts: MarketScout[];
  agents: Agent[];
  sponsors: Sponsor[];
  investors: Investor[];
  lastFetchedAt: string | null;

  // ── Transient (not persisted) ─────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Replace the full market snapshot synchronously (e.g. from bootstrap). */
  setMarketData: (data: MarketData) => void;

  /**
   * Fetch fresh market data from the backend, respecting the 5-minute cache.
   * Safe to call on every app resume — no-ops if cache is still warm.
   */
  fetchMarketData: () => Promise<void>;

  /**
   * Force a market data refresh, bypassing the 5-minute cache.
   * Called every 2 game weeks from the game loop to keep the pool topped up.
   */
  refreshMarketPool: () => Promise<void>;

  /**
   * Remove a recruited entity from the available market pool so it can't
   * be signed twice. Call immediately after a local recruit action.
   */
  removeFromMarket: (entityType: 'player' | 'coach' | 'scout', id: string) => void;
  updateMarketPlayer: (id: string, changes: Partial<MarketPlayer>) => void;
  addMarketPlayer: (player: MarketPlayer) => void;
  signPlayer: (playerId: string) => void;
  rejectPlayer: (playerId: string) => void;
  hireCoach: (coachId: string, weekNumber: number) => void;
  hireScout: (scoutId: string, weekNumber: number) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      players: [],
      coaches: [],
      marketScouts: [],
      agents: [],
      sponsors: [],
      investors: [],
      lastFetchedAt: null,
      isLoading: false,
      error: null,

      setMarketData: (data) => {
        const existingPlayers = get().players;
        const { playerFeeMultiplier } = useGameConfigStore.getState().config;

        // Preserve locally-added gem players that the backend doesn't know about
        const localGems = existingPlayers.filter(
          (p) => p.isLocalGem && !data.players.some((bp) => bp.id === p.id),
        );

        const playersWithScouting = data.players.map((p) => {
          const existing = existingPlayers.find((e) => e.id === p.id);
          if (existing?.scoutingStatus) {
            return {
              ...p,
              scoutingStatus: existing.scoutingStatus,
              scoutingProgress: existing.scoutingProgress ?? 0,
              marketValue: existing.marketValue ?? p.currentAbility * playerFeeMultiplier,
              currentOffer: existing.currentOffer ?? calculateAgentOffer(p.currentAbility * playerFeeMultiplier),
              perceivedAbility: existing.perceivedAbility,
              assignedScoutId: existing.assignedScoutId,
            };
          }
          return {
            ...p,
            scoutingStatus: 'hidden' as const,
            scoutingProgress: 0,
            marketValue: p.currentAbility * playerFeeMultiplier,
            currentOffer: calculateAgentOffer(p.currentAbility * playerFeeMultiplier),
          };
        });
        set({
          players: [...playersWithScouting, ...localGems],
          coaches: data.coaches,
          marketScouts: data.scouts,
          agents: data.agents,
          sponsors: data.sponsors,
          investors: data.investors,
          lastFetchedAt: new Date().toISOString(),
        });
      },

      fetchMarketData: async () => {
        const { lastFetchedAt, isLoading } = get();
        if (isLoading) return;

        // Serve from cache if still warm
        if (lastFetchedAt) {
          const age = Date.now() - new Date(lastFetchedAt).getTime();
          if (age < CACHE_TTL_MS) return;
        }

        set({ isLoading: true, error: null });
        try {
          const country = (await import('@/stores/academyStore')).useAcademyStore.getState().academy.country;
          const data = await marketApi.getMarketData(country);
          get().setMarketData(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch market data' });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshMarketPool: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const country = (await import('@/stores/academyStore')).useAcademyStore.getState().academy.country;
          const data = await marketApi.getMarketData(country);
          get().setMarketData(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to refresh market pool' });
        } finally {
          set({ isLoading: false });
        }
      },

      removeFromMarket: (entityType, id) => {
        if (entityType === 'player') {
          set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
        } else if (entityType === 'coach') {
          set((s) => ({ coaches: s.coaches.filter((c) => c.id !== id) }));
        } else {
          set((s) => ({ marketScouts: s.marketScouts.filter((sc) => sc.id !== id) }));
        }
      },
      updateMarketPlayer: (id, changes) =>
        set((state) => ({
          players: state.players.map((p) => p.id === id ? { ...p, ...changes } : p),
        })),
      addMarketPlayer: (player) =>
        set((state) => ({ players: [...state.players, player] })),

      signPlayer: (playerId) => {
        const player = get().players.find((p) => p.id === playerId);
        if (!player) return;

        const { coaches } = useCoachStore.getState();
        const headCoach = getHeadCoach(coaches);

        // Coach opinion and morale effects
        if (headCoach && player.marketValue && player.currentOffer) {
          try {
            const opinion = getCoachPerception(player, headCoach, useGameConfigStore.getState().config.playerFeeMultiplier);
            if (opinion.verdict === 'insulting') {
              useCoachStore.getState().updateMorale(headCoach.id, -10);
              updateCoachRelationship(headCoach.id, 'manager', 'manager', -15);
            } else if (opinion.verdict === 'steal') {
              useCoachStore.getState().updateMorale(headCoach.id, 5);
            }
          } catch { /* ignore valuation errors */ }
        }

        // Generate scouting report if player was revealed
        let scoutingReport: import('@/types/player').ScoutingReport | undefined;
        if (player.scoutingStatus === 'revealed' && player.perceivedAbility != null) {
          const diff = Math.abs(player.currentAbility - player.perceivedAbility);
          scoutingReport = {
            scoutId: player.assignedScoutId ?? 'unknown',
            scoutName: 'Scout',
            perceivedOverall: player.perceivedAbility,
            perceivedPotential: player.potential,
            actualOverall: player.currentAbility,
            actualPotential: player.potential,
            accuracyPercent: Math.max(0, 100 - diff * 2),
            revealedAt: useAcademyStore.getState().academy.weekNumber ?? 1,
          };
        }

        // Add to squad with true stats, stripped of market fields
        const { addPlayer } = useSquadStore.getState();
        const weekNumber = useAcademyStore.getState().academy.weekNumber ?? 1;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { generatePersonality } = require('@/engine/personality');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { generateAppearance } = require('@/engine/appearance');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { computePlayerAge, getGameDate } = require('@/utils/gameDate');
        const gameDate = getGameDate(weekNumber);
        const ageRaw = player.dateOfBirth ? computePlayerAge(player.dateOfBirth, gameDate) : 17;
        const age = typeof ageRaw === 'number' ? ageRaw : 17;
        const personality = generatePersonality();

        // Store backend guardians if not already in the store
        const existingGuardians = useGuardianStore.getState().getGuardiansForPlayer(player.id);
        if (existingGuardians.length === 0 && player.guardians && player.guardians.length > 0) {
          const guardians: Guardian[] = (player.guardians as ApiGuardian[]).map((g) => ({
            id: g.id,
            playerId: player.id,
            firstName: g.firstName,
            lastName: g.lastName,
            gender: g.gender,
            demandLevel: g.demandLevel,
            loyaltyToAcademy: g.loyaltyToAcademy,
            ignoredRequestCount: 0,
          }));
          useGuardianStore.getState().addGuardians(guardians);
        }
        const finalScoutingReport = scoutingReport;

        addPlayer({
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          dateOfBirth: player.dateOfBirth,
          age,
          position: player.position,
          nationality: player.nationality,
          overallRating: player.currentAbility,
          potential: player.potential,
          wage: player.currentAbility * 100,
          personality,
          appearance: generateAppearance(player.id, 'PLAYER', age, personality),
          agentId: player.agent?.id ?? null,
          joinedWeek: weekNumber,
          isActive: true,
          morale: 40,
          relationships: [],
          scoutingReport: finalScoutingReport,
          // Pass backend attributes through so GameLoop doesn't need to generate them
          ...(player.attributes ? { attributes: player.attributes } : {}),
        });

        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
        }));

        // Signing a player is a visible academy activity — meaningful rep boost
        const { setReputation: setRep, markRepActivity } = useAcademyStore.getState();
        setRep(1.0);
        markRepActivity();
      },

      rejectPlayer: (playerId) => {
        const player = get().players.find((p) => p.id === playerId);
        if (!player) return;

        const { coaches } = useCoachStore.getState();
        const headCoach = getHeadCoach(coaches);

        if (headCoach && player.marketValue && player.currentOffer) {
          try {
            const opinion = getCoachPerception(player, headCoach, useGameConfigStore.getState().config.playerFeeMultiplier);
            if (opinion.verdict === 'steal') {
              // Rejected a deal coach wanted
              useCoachStore.getState().updateMorale(headCoach.id, -5);
            } else if (opinion.verdict === 'insulting') {
              // Agreed to reject an overpriced player
              updateCoachRelationship(headCoach.id, 'manager', 'manager', 10);
              useCoachStore.getState().updateMorale(headCoach.id, 3);
            }
          } catch { /* ignore */ }
        }

        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
        }));
      },

      hireCoach: (coachId, weekNumber) => {
        const marketCoach = get().coaches.find((c) => c.id === coachId);
        if (!marketCoach) return;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { generatePersonality } = require('@/engine/personality');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { generateAppearance } = require('@/engine/appearance');
        const personality = generatePersonality();
        useCoachStore.getState().addCoach({
          id: marketCoach.id,
          name: `${marketCoach.firstName} ${marketCoach.lastName}`,
          role: marketCoach.role,
          salary: marketCoach.salary,
          influence: marketCoach.influence,
          personality,
          appearance: generateAppearance(marketCoach.id, 'COACH', 35, personality),
          nationality: marketCoach.nationality,
          joinedWeek: weekNumber,
          morale: marketCoach.morale ?? 70,
          specialisms: marketCoach.specialisms,
          relationships: [],
        });
        set((state) => ({ coaches: state.coaches.filter((c) => c.id !== coachId) }));

        // Hiring a coach signals investment in the academy — moderate rep boost
        const { setReputation: setRep, markRepActivity } = useAcademyStore.getState();
        setRep(1.0);
        markRepActivity();
      },

      hireScout: (scoutId, weekNumber) => {
        const marketScout = get().marketScouts.find((s) => s.id === scoutId);
        if (!marketScout) return;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { generateAppearance } = require('@/engine/appearance');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { computePlayerAge, getGameDate } = require('@/utils/gameDate');
        const gameDate = getGameDate(weekNumber);
        const ageRaw = marketScout.dateOfBirth ? computePlayerAge(marketScout.dateOfBirth, gameDate) : 35;
        const scoutAge = typeof ageRaw === 'number' ? ageRaw : 35;
        useScoutStore.getState().addScout({
          id: marketScout.id,
          name: `${marketScout.firstName} ${marketScout.lastName}`,
          salary: marketScout.salary,
          scoutingRange: marketScout.scoutingRange,
          successRate: marketScout.successRate,
          nationality: marketScout.nationality,
          joinedWeek: weekNumber,
          appearance: generateAppearance(marketScout.id, 'SCOUT', scoutAge),
          morale: 70,
          relationships: [],
          assignedPlayerIds: [],
        });
        set((state) => ({ marketScouts: state.marketScouts.filter((s) => s.id !== scoutId) }));
      },
    }),
    {
      name: 'market-store',
      storage: zustandStorage,
      // Only persist data; isLoading/error are transient session state
      partialize: (state) => ({
        players: state.players,
        coaches: state.coaches,
        marketScouts: state.marketScouts,
        agents: state.agents,
        sponsors: state.sponsors,
        investors: state.investors,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
