import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { WorldClub, WorldLeague, WorldPackResponse, WorldPlayer, SeasonUpdateLeague } from '@/types/world';
import type { MatchAppearance } from '@/types/player';
import type { TrophyRecord } from '@/types/club';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useFinanceStore } from '@/stores/financeStore';
import { penceToPounds } from '@/utils/currency';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';

const CLUBS_KEY_PREFIX = 'worldStore_clubs_';

const VALID_REPUTATION_TIERS = ['local', 'regional', 'national', 'elite'] as const;

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'] as const;

/**
 * Maximum reputation score while in a league of each tier.
 * Prevents the club's reputationTier from advancing beyond the league tier
 * without actual promotion.
 */
const LEAGUE_TIER_REP_CAP: Record<string, number> = {
  local:    14,
  regional: 39,
  national: 74,
  elite:    100,
};

interface WorldState {
  isInitialized: boolean;
  leagues: WorldLeague[];
  /** In-memory club map indexed by clubId. NOT persisted via Zustand — loaded via loadClubs(). */
  clubs: Record<string, WorldClub>;
  /** ID of the WorldLeague the AMP was placed into at world init. null until init runs. */
  ampLeagueId: string | null;
  /** null = ok; non-null = one or more league club keys failed to parse on load */
  clubsLoadError: string | null;
  /** Called once on app start after Zustand rehydrates meta. Loads per-league club data from AsyncStorage. */
  loadClubs: () => Promise<void>;
  /** Called once on successful POST /api/initialize. Persists everything and sets isInitialized. */
  setFromWorldPack: (pack: WorldPackResponse['worldPack']) => Promise<void>;
  getClub: (clubId: string) => WorldClub | undefined;
  getLeagueClubs: (leagueId: string) => WorldClub[];
  /**
   * Update a single club's player roster and re-persist it to AsyncStorage.
   * Called by MarketEngine after NPC-to-NPC transfers.
   */
  mutateClubRoster: (clubId: string, updatedPlayers: WorldPlayer[]) => Promise<void>;
  /**
   * Record match appearances for NPC players in bulk.
   * Groups updates by club and league to minimise AsyncStorage writes.
   */
  recordNpcAppearances: (entries: Array<{ playerId: string; clubId: string; season: string; appearance: MatchAppearance }>) => Promise<void>;
  /**
   * Replace all league + club data from a conclude-season API response.
   * AMP league placement is derived from the isAmp flag on the clubs array.
   * Persists per-league clubs to AsyncStorage.
   */
  applySeasonUpdate: (responseLeagues: SeasonUpdateLeague[]) => Promise<void>;
  addTrophyToClub: (clubId: string, trophy: TrophyRecord) => Promise<void>;
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      leagues: [],
      clubs: {},
      ampLeagueId: null,
      clubsLoadError: null,

      setFromWorldPack: async (pack) => {
        const leagues: WorldLeague[] = [];
        const clubs: Record<string, WorldClub> = {};
        const gameDate = getGameDate(1); // Default to Week 1 for world init age calculation

        // Build leagues + clubs, writing each league's club map to AsyncStorage with verification.
        // Throws on any write failure so the caller (useAuthFlow) is notified loudly.
        for (const leagueData of pack.leagues) {
          const clubIds = leagueData.clubs.map((c) => c.id);
          leagues.push({
            id:             leagueData.id,
            tier:           leagueData.tier,
            name:           leagueData.name,
            country:        leagueData.country,
            promotionSpots: leagueData.promotionSpots,
            reputationTier: leagueData.reputationTier,
            clubIds,
          });

          const leagueClubMap: Record<string, WorldClub> = {};
          for (const club of leagueData.clubs) {
            const builtClub: WorldClub = {
              ...club,
              formation: FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)],
              players: club.players.map((p) => ({
                ...p,
                npcClubId: club.id,
                appearance: generateAppearance(p.id, 'PLAYER', computePlayerAge(p.dateOfBirth, gameDate), p.personality),
              })),
              staff: club.staff.map((s) => ({
                ...s,
                appearance: generateAppearance(s.id, s.role === 'scout' ? 'SCOUT' : 'COACH', 35),
              })),
            };
            clubs[builtClub.id] = builtClub;
            leagueClubMap[builtClub.id] = builtClub;
          }

          const key = `${CLUBS_KEY_PREFIX}${leagueData.id}`;
          await AsyncStorage.setItem(key, JSON.stringify(leagueClubMap));

          // Verify the write round-tripped successfully (only when we had clubs to persist)
          if (leagueData.clubs.length > 0) {
            const verification = await AsyncStorage.getItem(key);
            if (!verification) {
              throw new Error(`WorldStore: storage write did not persist for league ${leagueData.id}`);
            }
            const parsed = JSON.parse(verification) as Record<string, WorldClub>;
            if (Object.keys(parsed).length === 0) {
              throw new Error(`WorldStore: persisted club map is empty for league ${leagueData.id}`);
            }
          }
        }

        // Find the bottom league for the AMP's country (highest tier number = lowest prestige).
        const ampClub = useClubStore.getState().club;
        const ampCountry = ampClub?.country ?? null;
        const ampClubId  = ampClub?.id ?? null;

        const bottomLeague = ampCountry
          ? leagues
              .filter((l) => l.country === ampCountry)
              .sort((a, b) => b.tier - a.tier)[0] ?? null
          : null;

        const ampLeagueId = bottomLeague?.id ?? null;

        // Wire leagueStore and fixtureStore if we found a bottom league and have an AMP club id.
        // These must succeed before set() so worldStore is never persisted as isInitialized: true
        // with incomplete league/fixture state.
        if (bottomLeague && ampClubId) {
          const clubSnapshots: ClubSnapshot[] = bottomLeague.clubIds
            .map((id) => clubs[id])
            .filter((c): c is WorldClub => c !== undefined)
            .map((c) => ({
              id:             c.id,
              name:           c.name,
              reputation:     c.reputation,
              tier:           c.tier,
              primaryColor:   c.primaryColor,
              secondaryColor: c.secondaryColor,
              stadiumName:    c.stadiumName,
              facilities:     c.facilities,
            }));

          // Read financial fields from the matching world pack league entry
          const ampLeagueData = pack.leagues.find((l) => l.id === bottomLeague.id);
          const tvDeal                        = ampLeagueData?.tvDeal                        ?? 0;
          const sponsorPot                    = ampLeagueData?.sponsorPot                    ?? 0;
          const prizeMoney                    = ampLeagueData?.prizeMoney                    ?? 0;
          const leaguePositionPot             = ampLeagueData?.leaguePositionPot             ?? 0;
          const leaguePositionDecreasePercent = ampLeagueData?.leaguePositionDecreasePercent ?? 0;

          const syntheticLeague: LeagueSnapshot = {
            id:                            bottomLeague.id,
            tier:                          bottomLeague.tier,
            name:                          bottomLeague.name,
            country:                       bottomLeague.country,
            season:                        1,
            promotionSpots:                bottomLeague.promotionSpots,
            reputationTier:                (VALID_REPUTATION_TIERS as readonly string[]).includes(bottomLeague.reputationTier ?? '')
                                             ? (bottomLeague.reputationTier as LeagueSnapshot['reputationTier'])
                                             : null,
            reputationCap:                 bottomLeague.reputationTier
                                             ? (LEAGUE_TIER_REP_CAP[bottomLeague.reputationTier] ?? null)
                                             : null,
            tvDeal:                        tvDeal   || null,
            sponsorPot,
            prizeMoney:                    prizeMoney           || null,
            leaguePositionPot:             leaguePositionPot    || null,
            leaguePositionDecreasePercent,
            clubs:                         clubSnapshots,
          };

          useLeagueStore.getState().setFromSync(syntheticLeague);

          // Credit Season 1 TV deal and league sponsor pot immediately — covers the whole season upfront
          {
            const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
            if (tvDeal > 0) {
              useFinanceStore.getState().addTransaction({
                amount:      penceToPounds(tvDeal),
                category:    'tv_deal',
                description: 'Season 1 TV deal',
                weekNumber,
              });
            }
            if (sponsorPot > 0) {
              useFinanceStore.getState().addTransaction({
                amount:      penceToPounds(sponsorPot),
                category:    'league_sponsor',
                description: 'Season 1 league sponsor',
                weekNumber,
              });
            }
          }

          useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, 1, ampClubId);
        } else if (!bottomLeague) {
          if (ampCountry) {
            console.warn(`[WorldStore] setFromWorldPack: no league found for AMP country "${ampCountry}" — league/fixture wiring skipped`);
          } else {
            console.warn('[WorldStore] setFromWorldPack: AMP club has no country set — league/fixture wiring skipped');
          }
        }

        // Generate fixtures for every non-AMP league so Browse tables stay live
        for (const league of leagues) {
          if (league.id !== ampLeagueId) {
            useFixtureStore.getState().generateFixturesFromWorldLeague(league, 1);
          }
        }

        // set() is LAST — only called after all wiring succeeds so worldStore is never persisted
        // as isInitialized: true with incomplete cross-store state.
        set({ isInitialized: true, leagues, clubs, ampLeagueId });
      },

      loadClubs: async () => {
        const { leagues } = get();
        if (leagues.length === 0) return;
        const clubs: Record<string, WorldClub> = {};
        const errors: string[] = [];
        for (const league of leagues) {
          const raw = await AsyncStorage.getItem(`${CLUBS_KEY_PREFIX}${league.id}`);
          if (raw) {
            try {
              const leagueClubs = JSON.parse(raw) as Record<string, WorldClub>;
              Object.assign(clubs, leagueClubs);
            } catch (e) {
              console.warn(`[WorldStore] Failed to parse clubs for league ${league.id}:`, e);
              errors.push(`league ${league.id}: ${String(e)}`);
            }
          }
        }
        set({
          clubs,
          clubsLoadError: errors.length > 0 ? errors.join('; ') : null,
        });
      },

      getClub: (clubId) => get().clubs[clubId],

      getLeagueClubs: (leagueId) => {
        const league = get().leagues.find((l) => l.id === leagueId);
        if (!league) return [];
        const { clubs } = get();
        return league.clubIds
          .map((id) => clubs[id])
          .filter((c): c is WorldClub => c !== undefined);
      },

      applySeasonUpdate: async (responseLeagues) => {
        // Derive the AMP's new league from the isAmp flag — authoritative from server
        const ampLeagueEntry = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
        const updatedAmpLeagueId = ampLeagueEntry?.id ?? get().ampLeagueId;

        // Rebuild WorldLeague metadata.
        // NPC club rosters are NOT replaced — only clubIds, league metadata, and club.tier update.
        // AMP is excluded from clubIds (it is the player's own club, not an NPC).
        // Each club appears in exactly one league in the backend response — its correct new assignment.
        // relegated/promoted flags describe the club's status; they do not affect league membership.
        const leagues: WorldLeague[] = responseLeagues.map((l) => ({
          id:             l.id,
          tier:           l.tier,
          name:           l.name,
          country:        l.country,
          promotionSpots: l.promotionSpots,
          reputationTier: l.reputationTier,
          clubIds:        l.clubs.filter((c) => !c.isAmp).map((c) => c.clubId),
        }));

        // Update every NPC club's tier to match their new league assignment.
        // Tier is now derived from the parent league (l.tier), not the club entry.
        const currentClubs = get().clubs;
        const updatedClubs: Record<string, WorldClub> = { ...currentClubs };

        for (const l of responseLeagues) {
          for (const slim of l.clubs) {
            if (slim.isAmp) continue; // AMP not in worldClubs
            const existing = updatedClubs[slim.clubId];
            if (existing) {
              updatedClubs[slim.clubId] = { ...existing, tier: l.tier };
            }
          }
        }

        // Persist ALL leagues to AsyncStorage — directly follow the backend's assignment.
        // No dirty-tracking: every league gets its authoritative club map written.
        for (const l of responseLeagues) {
          const npcClubIds = l.clubs.filter((c) => !c.isAmp).map((c) => c.clubId);
          const leagueClubMap: Record<string, WorldClub> = {};
          for (const id of npcClubIds) {
            if (updatedClubs[id]) leagueClubMap[id] = updatedClubs[id];
          }
          await AsyncStorage.setItem(
            `${CLUBS_KEY_PREFIX}${l.id}`,
            JSON.stringify(leagueClubMap),
          );
        }

        set({
          leagues,
          clubs: updatedClubs,
          ampLeagueId: updatedAmpLeagueId,
        });
      },

      mutateClubRoster: async (clubId, updatedPlayers) => {
        const { clubs, leagues } = get();
        const club = clubs[clubId];
        if (!club) return;

        const updatedClub = { ...club, players: updatedPlayers };

        // Update in-memory map
        set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

        // Find which league this club belongs to and re-persist that league's clubs
        const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
        if (!leagueId) return;

        const allLeagueClubs = get().getLeagueClubs(leagueId);
        const leagueClubMap: Record<string, WorldClub> = {};
        for (const c of allLeagueClubs) {
          leagueClubMap[c.id] = c.id === clubId ? updatedClub : c;
        }
        await AsyncStorage.setItem(
          `${CLUBS_KEY_PREFIX}${leagueId}`,
          JSON.stringify(leagueClubMap),
        );
      },

      addTrophyToClub: async (clubId, trophy) => {
        const { clubs, leagues } = get();
        const club = clubs[clubId];
        if (!club) return;

        const updatedClub = { ...club, trophies: [...(club.trophies ?? []), trophy] };

        // Update in-memory map
        set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

        // Find which league this club belongs to and re-persist that league's clubs
        const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
        if (!leagueId) return;

        const allLeagueClubs = get().getLeagueClubs(leagueId);
        const leagueClubMap: Record<string, WorldClub> = {};
        for (const c of allLeagueClubs) {
          leagueClubMap[c.id] = c.id === clubId ? updatedClub : c;
        }
        await AsyncStorage.setItem(
          `${CLUBS_KEY_PREFIX}${leagueId}`,
          JSON.stringify(leagueClubMap),
        );
      },

      recordNpcAppearances: async (entries) => {
        if (entries.length === 0) return;
        const { clubs, leagues } = get();

        // Build updated club map — apply all appearance entries in memory first
        const updatedClubs: Record<string, WorldClub> = { ...clubs };
        for (const { playerId, clubId, season, appearance } of entries) {
          const club = updatedClubs[clubId];
          if (!club) continue;
          const updatedPlayers = club.players.map((p) => {
            if (p.id !== playerId) return p;
            const prev = p.appearances ?? {};
            const seasonBucket = prev[season] ?? {};
            const clubBucket = seasonBucket[clubId] ?? [];
            return {
              ...p,
              appearances: {
                ...prev,
                [season]: { ...seasonBucket, [clubId]: [...clubBucket, appearance] },
              },
            };
          });
          updatedClubs[clubId] = { ...club, players: updatedPlayers };
        }

        // Update in-memory state once
        set({ clubs: updatedClubs });

        // Determine which leagues are affected and persist each once
        const affectedClubIds = new Set(entries.map((e) => e.clubId));
        const affectedLeagueIds = new Set<string>();
        for (const clubId of affectedClubIds) {
          const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
          if (leagueId) affectedLeagueIds.add(leagueId);
        }

        for (const leagueId of affectedLeagueIds) {
          const league = leagues.find((l) => l.id === leagueId);
          if (!league) continue;
          const leagueClubMap: Record<string, WorldClub> = {};
          for (const id of league.clubIds) {
            if (updatedClubs[id]) leagueClubMap[id] = updatedClubs[id];
          }
          await AsyncStorage.setItem(
            `${CLUBS_KEY_PREFIX}${leagueId}`,
            JSON.stringify(leagueClubMap),
          );
        }
      },
    }),
    {
      name: 'worldStore_meta',
      storage: zustandStorage,
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        leagues:       state.leagues,
        ampLeagueId:   state.ampLeagueId,
        // clubs excluded — stored per-league in AsyncStorage
        // clubsLoadError excluded — transient, reset on each loadClubs call
      }),
    },
  ),
);
