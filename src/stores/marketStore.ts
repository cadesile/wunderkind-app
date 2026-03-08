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
   * Remove a recruited entity from the available market pool so it can't
   * be signed twice. Call immediately after a local recruit action.
   */
  removeFromMarket: (entityType: 'player' | 'coach' | 'scout', id: string) => void;
  updateMarketPlayer: (id: string, changes: Partial<MarketPlayer>) => void;
  addMarketPlayer: (player: MarketPlayer) => void;
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
        const playersWithScouting = data.players.map((p) => {
          const existing = existingPlayers.find((e) => e.id === p.id);
          if (existing?.scoutingStatus) {
            return {
              ...p,
              scoutingStatus: existing.scoutingStatus,
              scoutingProgress: existing.scoutingProgress ?? 0,
              marketValue: existing.marketValue ?? p.currentAbility * 1000,
              currentOffer: existing.currentOffer ?? calculateAgentOffer(p.currentAbility * 1000),
              perceivedAbility: existing.perceivedAbility,
              assignedScoutId: existing.assignedScoutId,
            };
          }
          return {
            ...p,
            scoutingStatus: 'hidden' as const,
            scoutingProgress: 0,
            marketValue: p.currentAbility * 1000,
            currentOffer: calculateAgentOffer(p.currentAbility * 1000),
          };
        });
        set({
          players: playersWithScouting,
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
          const data = await marketApi.getMarketData();
          get().setMarketData(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch market data' });
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
