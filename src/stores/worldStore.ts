import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { WorldClub, WorldLeague, WorldPackResponse } from '@/types/world';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';

const CLUBS_KEY_PREFIX = 'worldStore_clubs_';

const VALID_REPUTATION_TIERS = ['local', 'regional', 'national', 'elite'] as const;

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
            clubs[club.id] = club;
            leagueClubMap[club.id] = club;
          }

          const key = `${CLUBS_KEY_PREFIX}${leagueData.id}`;
          try {
            await AsyncStorage.setItem(key, JSON.stringify(leagueClubMap));

            // Verify the write round-tripped successfully
            const verification = await AsyncStorage.getItem(key);
            if (!verification) {
              throw new Error(`WorldStore: storage write did not persist for league ${leagueData.id}`);
            }
            const parsed = JSON.parse(verification) as Record<string, WorldClub>;
            if (Object.keys(parsed).length === 0) {
              throw new Error(`WorldStore: persisted club map is empty for league ${leagueData.id}`);
            }
          } catch (e) {
            // Rethrow so the caller (useAuthFlow) surfaces this as console.error
            throw e;
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
            tvDeal:                        null,
            sponsorPot:                    0,
            prizeMoney:                    null,
            leaguePositionPot:             null,
            leaguePositionDecreasePercent: 0,
            clubs:                         clubSnapshots,
          };

          useLeagueStore.getState().setFromSync(syntheticLeague);
          useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, ampClubId, 1);
        } else if (!bottomLeague) {
          if (ampCountry) {
            console.warn(`[WorldStore] setFromWorldPack: no league found for AMP country "${ampCountry}" — league/fixture wiring skipped`);
          } else {
            console.warn('[WorldStore] setFromWorldPack: AMP club has no country set — league/fixture wiring skipped');
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
