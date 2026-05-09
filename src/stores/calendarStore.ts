import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { getFirstSaturdayOfJune, addWeeks, getNextJuneDate } from '@/utils/dateUtils';

interface CalendarState {
  /** ISO date string for the current in-game date. */
  gameDate: string;
  /** Seed the game date on world initialisation. */
  setGameDate: (date: Date) => void;
  /** Advance by 1 week. Called by GameLoop after each tick. */
  advanceGameDate: () => void;
  /** Jump to first Saturday of June next year (used by time-skip animation). */
  skipToNextJune: () => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      gameDate: getFirstSaturdayOfJune(new Date().getFullYear()).toISOString(),

      setGameDate: (date) => set({ gameDate: date.toISOString() }),

      advanceGameDate: () =>
        set({ gameDate: addWeeks(new Date(get().gameDate), 1).toISOString() }),

      skipToNextJune: () =>
        set({ gameDate: getNextJuneDate(new Date(get().gameDate)).toISOString() }),
    }),
    { name: 'calendar-store', storage: zustandStorage },
  ),
);
