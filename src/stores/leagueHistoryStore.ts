import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { LeagueSeasonRecord } from '@/types/leagueHistory';

interface LeagueHistoryState {
  /**
   * League history keyed by tier (1–8).
   * Each entry is an ordered list of season records, oldest first.
   */
  history: Record<number, LeagueSeasonRecord[]>;

  /** Append a completed season record for the given tier. */
  addSeasonRecord: (record: LeagueSeasonRecord) => void;

  /** Return all records for a given tier, oldest first. */
  getByTier: (tier: number) => LeagueSeasonRecord[];

  /** Return the most recent record for a given tier, or null if none. */
  getLatestByTier: (tier: number) => LeagueSeasonRecord | null;
}

export const useLeagueHistoryStore = create<LeagueHistoryState>()(
  persist(
    (set, get) => ({
      history: {},

      addSeasonRecord: (record) =>
        set((state) => {
          const existing = state.history[record.tier] ?? [];
          return {
            history: {
              ...state.history,
              [record.tier]: [...existing, record],
            },
          };
        }),

      getByTier: (tier) => get().history[tier] ?? [],

      getLatestByTier: (tier) => {
        const records = get().history[tier];
        return records && records.length > 0 ? records[records.length - 1] : null;
      },
    }),
    {
      name: 'league-history-store',
      storage: zustandStorage,
      // Keep only the last 10 seasons per tier — older history is decorative.
      partialize: (state) => ({
        history: Object.fromEntries(
          Object.entries(state.history).map(([tier, records]) => [tier, records.slice(-10)]),
        ),
      }),
    },
  ),
);
