import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerMatchStats {
  id: string;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface MatchResultRecord {
  fixtureId: string;
  season: number;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  homeAvgRating: number;
  awayAvgRating: number;
  homePlayers: PlayerMatchStats[];
  awayPlayers: PlayerMatchStats[];
  playedAt: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface MatchResultStoreState {
  results: Record<string, MatchResultRecord>;
  addResult: (record: MatchResultRecord) => void;
  /**
   * Bulk version of addResult — inserts all records in a single set() call.
   * Use in SimulationService to avoid one AsyncStorage write per fixture.
   */
  batchAddResults: (records: MatchResultRecord[]) => void;
  /** Removes records from seasons more than 1 behind currentSeason (keeps current + previous). */
  pruneOldSeasons: (currentSeason: number) => void;
}

export const useMatchResultStore = create<MatchResultStoreState>()(
  persist(
    (set) => ({
      results: {},

      addResult: (record) =>
        set((s) => ({ results: { ...s.results, [record.fixtureId]: record } })),

      batchAddResults: (records) => {
        if (records.length === 0) return;
        set((s) => {
          const merged = { ...s.results };
          for (const r of records) merged[r.fixtureId] = r;
          return { results: merged };
        });
      },

      pruneOldSeasons: (currentSeason) =>
        set((s) => {
          const keep: Record<string, MatchResultRecord> = {};
          for (const [id, r] of Object.entries(s.results)) {
            if (r.season >= currentSeason - 1) keep[id] = r;
          }
          return { results: keep };
        }),
    }),
    {
      name: 'match-result-store',
      storage: zustandStorage,
      // Strip player arrays (large, redundant with leagueStatsStore) and cap total records.
      partialize: (state) => {
        const entries = Object.entries(state.results)
          .sort(([, a], [, b]) => b.season - a.season || b.playedAt.localeCompare(a.playedAt))
          .slice(0, 200);
        return {
          results: Object.fromEntries(
            entries.map(([id, r]) => [id, { ...r, homePlayers: [], awayPlayers: [] }]),
          ),
        };
      },
    },
  ),
);
