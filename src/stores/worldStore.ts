import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { WorldClub, WorldLeague, WorldPackResponse } from '@/types/world';

const CLUBS_KEY_PREFIX = 'worldStore_clubs_';

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

          await AsyncStorage.setItem(
            `${CLUBS_KEY_PREFIX}${leagueData.id}`,
            JSON.stringify(leagueClubMap),
          );
        }

        set({ isInitialized: true, leagues, clubs });
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
