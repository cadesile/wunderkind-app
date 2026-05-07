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
  /** Removes records from seasons more than 1 behind currentSeason (keeps current + previous). */
  pruneOldSeasons: (currentSeason: number) => void;
}

export const useMatchResultStore = create<MatchResultStoreState>()(
  persist(
    (set) => ({
      results: {},

      addResult: (record) =>
        set((s) => ({ results: { ...s.results, [record.fixtureId]: record } })),

      pruneOldSeasons: (currentSeason) =>
        set((s) => {
          const keep: Record<string, MatchResultRecord> = {};
          for (const [id, r] of Object.entries(s.results)) {
            if (r.season >= currentSeason - 1) keep[id] = r;
          }
          return { results: keep };
        }),
    }),
    { name: 'match-result-store', storage: zustandStorage },
  ),
);
