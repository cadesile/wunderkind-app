import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LeagueSnapshot, ClubSnapshot } from '@/types/api';
import { zustandStorage } from '@/utils/storage';

interface LeagueState {
  league: LeagueSnapshot | null;
  clubs: ClubSnapshot[];
  /** Monotonically increasing season counter. Starts at 1, incremented at each season transition. */
  currentSeason: number;
}

interface LeagueActions {
  setFromSync: (league: LeagueSnapshot | null) => void;
  /** Increment currentSeason by 1. Called by SeasonTransitionService at the end of each season. */
  incrementSeason: () => void;
  clear: () => void;
}

type LeagueStore = LeagueState & LeagueActions;

/** Selector — read currentSeason without subscribing to the whole store. */
export const selectCurrentSeason = (state: LeagueStore) => state.currentSeason;

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set) => ({
      league: null,
      clubs: [],
      currentSeason: 1,

      setFromSync: (league) =>
        set({
          league,
          clubs: league ? league.clubs : [],
          // Keep currentSeason in sync with the authoritative league.season value.
          // This acts as a safety net; SeasonTransitionService also calls incrementSeason().
          currentSeason: league?.season ?? 1,
        }),

      incrementSeason: () =>
        set((state) => ({ currentSeason: state.currentSeason + 1 })),

      clear: () =>
        set({ league: null, clubs: [], currentSeason: 1 }),
    }),
    {
      name: 'league-store',
      storage: zustandStorage,
    }
  )
);
