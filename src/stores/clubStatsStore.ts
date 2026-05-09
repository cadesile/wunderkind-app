import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** All-time match record for a club, maintained as running totals. */
export interface ClubAllTimeStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/** Input entry for a single completed fixture result (both sides). */
export interface ClubResultEntry {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

const DEFAULT_STATS: ClubAllTimeStats = {
  played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface ClubStatsState {
  /** All-time record keyed by clubId. Fixed size (one entry per club). */
  records: Record<string, ClubAllTimeStats>;

  /**
   * Update all-time records for both clubs in a batch of fixture results.
   * Single set() call for the entire simulation batch — avoids per-fixture writes.
   */
  batchUpdateFromResults: (entries: ClubResultEntry[]) => void;

  /** Returns the all-time record for a club, or null if no games recorded yet. */
  getClubRecord: (clubId: string) => ClubAllTimeStats | null;
}

export const useClubStatsStore = create<ClubStatsState>()(
  persist(
    (set, get) => ({
      records: {},

      batchUpdateFromResults: (entries) => {
        if (entries.length === 0) return;
        set((state) => {
          const updated = { ...state.records };
          for (const { homeClubId, awayClubId, homeGoals, awayGoals } of entries) {
            const home = updated[homeClubId] ?? { ...DEFAULT_STATS };
            const away = updated[awayClubId] ?? { ...DEFAULT_STATS };

            if (homeGoals > awayGoals) {
              updated[homeClubId] = { played: home.played + 1, wins: home.wins + 1, draws: home.draws, losses: home.losses, goalsFor: home.goalsFor + homeGoals, goalsAgainst: home.goalsAgainst + awayGoals };
              updated[awayClubId] = { played: away.played + 1, wins: away.wins, draws: away.draws, losses: away.losses + 1, goalsFor: away.goalsFor + awayGoals, goalsAgainst: away.goalsAgainst + homeGoals };
            } else if (homeGoals < awayGoals) {
              updated[homeClubId] = { played: home.played + 1, wins: home.wins, draws: home.draws, losses: home.losses + 1, goalsFor: home.goalsFor + homeGoals, goalsAgainst: home.goalsAgainst + awayGoals };
              updated[awayClubId] = { played: away.played + 1, wins: away.wins + 1, draws: away.draws, losses: away.losses, goalsFor: away.goalsFor + awayGoals, goalsAgainst: away.goalsAgainst + homeGoals };
            } else {
              updated[homeClubId] = { played: home.played + 1, wins: home.wins, draws: home.draws + 1, losses: home.losses, goalsFor: home.goalsFor + homeGoals, goalsAgainst: home.goalsAgainst + awayGoals };
              updated[awayClubId] = { played: away.played + 1, wins: away.wins, draws: away.draws + 1, losses: away.losses, goalsFor: away.goalsFor + awayGoals, goalsAgainst: away.goalsAgainst + homeGoals };
            }
          }
          return { records: updated };
        });
      },

      getClubRecord: (clubId) => get().records[clubId] ?? null,
    }),
    { name: 'club-stats-store', storage: zustandStorage },
  ),
);
