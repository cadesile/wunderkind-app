import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { PlayerSeasonStats, PlayerCareerTotals } from '@/types/stats';

// ─── Composite key ─────────────────────────────────────────────────────────────

type StatsKey = string; // `${playerId}:${clubId}:${leagueId}:${season}`

function makeKey(
  playerId: string,
  clubId: string,
  leagueId: string,
  season: number,
): StatsKey {
  return `${playerId}:${clubId}:${leagueId}:${season}`;
}

// ─── Aggregation helper ────────────────────────────────────────────────────────

/**
 * Collapses an array of PlayerSeasonStats records into one PlayerCareerTotals
 * per player, computing a weighted running average for averageRating.
 */
function aggregateByPlayer(records: PlayerSeasonStats[]): PlayerCareerTotals[] {
  const byPlayer = new Map<string, PlayerCareerTotals>();

  for (const r of records) {
    const prev = byPlayer.get(r.playerId);
    if (prev) {
      const newApps = prev.appearances + r.appearances;
      const newAvg =
        newApps > 0
          ? (prev.averageRating * prev.appearances + r.averageRating * r.appearances) / newApps
          : 0;
      byPlayer.set(r.playerId, {
        playerId:      r.playerId,
        goals:         prev.goals + r.goals,
        assists:       prev.assists + r.assists,
        appearances:   newApps,
        averageRating: Math.round(newAvg * 100) / 100,
      });
    } else {
      byPlayer.set(r.playerId, {
        playerId:      r.playerId,
        goals:         r.goals,
        assists:       r.assists,
        appearances:   r.appearances,
        averageRating: r.averageRating,
      });
    }
  }

  return Array.from(byPlayer.values());
}

// ─── Store interface ───────────────────────────────────────────────────────────

interface LeagueStatsState {
  /** Flat map of stat records keyed by composite `playerId:clubId:leagueId:season`. */
  records: Record<StatsKey, PlayerSeasonStats>;

  /**
   * Upserts a match performance for the given player/club/league/season slot.
   * Increments goals, assists, and appearances; recalculates averageRating as
   * a running average weighted by appearances.
   */
  recordMatchStats: (
    playerId: string,
    clubId: string,
    leagueId: string,
    season: number,
    goals: number,
    assists: number,
    rating: number,
  ) => void;

  /** Returns all records for a player across all seasons and clubs. */
  getPlayerStats: (playerId: string) => PlayerSeasonStats[];

  /**
   * Returns all records for a club, aggregated as career totals per player
   * (summed across all seasons the player was at that club).
   */
  getClubStats: (clubId: string) => PlayerCareerTotals[];

  /**
   * Returns all records for a league, aggregated as career totals per player
   * (summed across all seasons and clubs within that league).
   */
  getLeagueStats: (leagueId: string) => PlayerCareerTotals[];

  /** Returns a single record aggregating the player's stats across all clubs and seasons. */
  getPlayerCareerTotals: (playerId: string) => PlayerCareerTotals | null;

  /** Wipes all records. Called from resetAllStores. */
  resetStats: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLeagueStatsStore = create<LeagueStatsState>()(
  persist(
    (set, get) => ({
      records: {},

      recordMatchStats: (playerId, clubId, leagueId, season, goals, assists, rating) => {
        const key = makeKey(playerId, clubId, leagueId, season);
        set((state) => {
          const prev = state.records[key];

          if (prev) {
            const newApps = prev.appearances + 1;
            const newAvg  = (prev.averageRating * prev.appearances + rating) / newApps;
            return {
              records: {
                ...state.records,
                [key]: {
                  ...prev,
                  goals:         prev.goals + goals,
                  assists:       prev.assists + assists,
                  appearances:   newApps,
                  averageRating: Math.round(newAvg * 100) / 100,
                },
              },
            };
          }

          return {
            records: {
              ...state.records,
              [key]: {
                playerId,
                clubId,
                leagueId,
                season,
                goals,
                assists,
                appearances:   1,
                averageRating: Math.round(rating * 100) / 100,
              },
            },
          };
        });
      },

      getPlayerStats: (playerId) =>
        Object.values(get().records).filter((r) => r.playerId === playerId),

      getClubStats: (clubId) =>
        aggregateByPlayer(
          Object.values(get().records).filter((r) => r.clubId === clubId),
        ),

      getLeagueStats: (leagueId) =>
        aggregateByPlayer(
          Object.values(get().records).filter((r) => r.leagueId === leagueId),
        ),

      getPlayerCareerTotals: (playerId) => {
        const playerRecords = Object.values(get().records).filter(
          (r) => r.playerId === playerId,
        );
        if (playerRecords.length === 0) return null;
        const aggregated = aggregateByPlayer(playerRecords);
        return aggregated[0] ?? null;
      },

      resetStats: () => set({ records: {} }),
    }),
    { name: 'league-stats-store', storage: zustandStorage },
  ),
);
