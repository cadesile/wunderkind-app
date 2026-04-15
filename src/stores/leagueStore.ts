import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LeagueSnapshot, ClubSnapshot } from '@/types/api';
import { zustandStorage } from '@/utils/storage';

interface LeagueState {
  league: LeagueSnapshot | null;
  clubs: ClubSnapshot[];
}

interface LeagueActions {
  setFromSync: (league: LeagueSnapshot | null) => void;
  clear: () => void;
}

type LeagueStore = LeagueState & LeagueActions;

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set) => ({
      league: null,
      clubs: [],

      setFromSync: (league) =>
        set({
          league,
          clubs: league ? league.clubs : [],
        }),

      clear: () =>
        set({ league: null, clubs: [] }),
    }),
    {
      name: 'league-store',
      storage: zustandStorage,
    }
  )
);
