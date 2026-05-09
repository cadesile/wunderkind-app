import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerSeasonStats, PlayerCareerTotals } from '@/types/stats';

// ─── Per-season partitioned storage ────────────────────────────────────────────
//
// Instead of one monolithic blob, records are split across per-season keys:
//   league-stats-store:s1  →  all records where season === 1
//   league-stats-store:s2  →  all records where season === 2
//   …
// This keeps each individual SQLite row small and makes season pruning a
// single removeItem() call rather than a full re-serialise of the store.

const STATS_PREFIX = 'league-stats-store';

/**
 * Build a per-tier-season sub-key: `league-stats-store:t{tier}_s{season}`.
 * Each SQLite row stays small (~50–150 KB) and old seasons can be removed
 * one key at a time without re-serialising the whole store.
 */
function subKey(tier: number, season: number): string {
  return `${STATS_PREFIX}:t${tier}_s${season}`;
}

const tierSeasonPartitionedStorage: PersistStorage<LeagueStatsState> = {
  getItem: async (_name): Promise<StorageValue<LeagueStatsState> | null> => {
    try {
      const allKeys = (await AsyncStorage.getAllKeys()) as string[];
      const subKeys = allKeys.filter((k) => k.startsWith(`${STATS_PREFIX}:t`));
      if (subKeys.length === 0) return null;
      const pairs = await AsyncStorage.multiGet(subKeys);
      const merged: Record<string, PlayerSeasonStats> = {};
      for (const [, val] of pairs) {
        if (val) Object.assign(merged, JSON.parse(val));
      }
      return { state: { records: merged } as LeagueStatsState, version: 0 };
    } catch (_e) {
      return null;
    }
  },

  setItem: async (_name, value: StorageValue<LeagueStatsState>) => {
    try {
      const records = value.state?.records ?? {};

      // Group records by tier+season (tier stored on each record)
      const groups = new Map<string, Record<string, PlayerSeasonStats>>();
      for (const [key, r] of Object.entries(records)) {
        const sk = subKey(r.tier ?? 1, r.season);
        if (!groups.has(sk)) groups.set(sk, {});
        groups.get(sk)![key] = r;
      }

      if (groups.size === 0) return;

      await AsyncStorage.multiSet(
        Array.from(groups.entries()).map(([sk, recs]) => [sk, JSON.stringify(recs)]) as [string, string][],
      );

      // Remove sub-keys whose tier+season is no longer in state (post-prune)
      const allKeys = (await AsyncStorage.getAllKeys()) as string[];
      const existing = allKeys.filter((k) => k.startsWith(`${STATS_PREFIX}:t`));
      const active = new Set(groups.keys());
      const stale = existing.filter((k) => !active.has(k));
      if (stale.length > 0) await AsyncStorage.multiRemove(stale);
    } catch (e) {
      console.error('[leagueStatsStore] setItem failed:', e);
    }
  },

  removeItem: async (_name) => {
    try {
      const allKeys = (await AsyncStorage.getAllKeys()) as string[];
      const subKeys = allKeys.filter((k) => k.startsWith(`${STATS_PREFIX}:t`));
      if (subKeys.length > 0) await AsyncStorage.multiRemove(subKeys);
    } catch (_e) {}
  },
};

// ─── Composite key ─────────────────────────────────────────────────────────────

type StatsKey = string; // `${playerId}:${clubId}:${leagueId}:${season}`

/** Single entry for bulk stats recording — one per player-per-fixture. */
export interface BulkStatsEntry {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  /** League tier (1 = top flight) — used to partition AsyncStorage keys. */
  tier: number;
  goals: number;
  assists: number;
  rating: number;
}

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
    tier: number,
    goals: number,
    assists: number,
    rating: number,
  ) => void;

  /**
   * Bulk version of recordMatchStats — processes all entries in a single set() call
   * instead of one call per player. Use this in SimulationService to avoid hundreds
   * of individual AsyncStorage writes per simulation batch.
   */
  batchRecordMatchStats: (entries: BulkStatsEntry[]) => void;

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

  /** Top scorer for a club (all-time, across all seasons in leagueStatsStore). */
  getClubTopScorer: (clubId: string) => PlayerCareerTotals | null;

  /** Top assister for a club (all-time, across all seasons in leagueStatsStore). */
  getClubTopAssister: (clubId: string) => PlayerCareerTotals | null;

  /**
   * Removes all records for seasons older than currentSeason - 1.
   * Call at season transition to keep the blob bounded to ~2 seasons.
   */
  pruneOldSeasons: (currentSeason: number) => void;

  /** Wipes all records. Called from resetAllStores. */
  resetStats: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLeagueStatsStore = create<LeagueStatsState>()(
  persist(
    (set, get) => ({
      records: {},

      recordMatchStats: (playerId, clubId, leagueId, season, tier, goals, assists, rating) => {
        const key = makeKey(playerId, clubId, leagueId, season);
        set((state) => {
          const prev = state.records[key];
          if (prev) {
            const newApps = prev.appearances + 1;
            const newAvg  = (prev.averageRating * prev.appearances + rating) / newApps;
            return {
              records: {
                ...state.records,
                [key]: { ...prev, goals: prev.goals + goals, assists: prev.assists + assists, appearances: newApps, averageRating: Math.round(newAvg * 100) / 100 },
              },
            };
          }
          return {
            records: {
              ...state.records,
              [key]: { playerId, clubId, leagueId, season, tier, goals, assists, appearances: 1, averageRating: Math.round(rating * 100) / 100 },
            },
          };
        });
      },

      batchRecordMatchStats: (entries) =>
        set((state) => {
          const updated = { ...state.records };
          for (const e of entries) {
            const key = makeKey(e.playerId, e.clubId, e.leagueId, e.season);
            const prev = updated[key];
            if (prev) {
              const newApps = prev.appearances + 1;
              const newAvg  = (prev.averageRating * prev.appearances + e.rating) / newApps;
              updated[key] = { ...prev, goals: prev.goals + e.goals, assists: prev.assists + e.assists, appearances: newApps, averageRating: Math.round(newAvg * 100) / 100 };
            } else {
              updated[key] = { playerId: e.playerId, clubId: e.clubId, leagueId: e.leagueId, season: e.season, tier: e.tier, goals: e.goals, assists: e.assists, appearances: 1, averageRating: Math.round(e.rating * 100) / 100 };
            }
          }
          return { records: updated };
        }),

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

      getClubTopScorer: (clubId) => {
        const records = Object.values(get().records).filter((r) => r.clubId === clubId);
        if (records.length === 0) return null;
        const totals = aggregateByPlayer(records);
        return totals.sort((a, b) => b.goals - a.goals)[0] ?? null;
      },

      getClubTopAssister: (clubId) => {
        const records = Object.values(get().records).filter((r) => r.clubId === clubId);
        if (records.length === 0) return null;
        const totals = aggregateByPlayer(records);
        return totals.sort((a, b) => b.assists - a.assists)[0] ?? null;
      },

      // Keep current season + 1 previous season for all tiers.
      // The storage adapter then removes the now-empty per-tier-season keys automatically.
      pruneOldSeasons: (currentSeason) =>
        set((state) => ({
          records: Object.fromEntries(
            Object.entries(state.records).filter(([, r]) => r.season >= currentSeason - 1),
          ),
        })),

      resetStats: () => set({ records: {} }),
    }),
    {
      name: STATS_PREFIX,
      storage: tierSeasonPartitionedStorage,
    },
  ),
);
