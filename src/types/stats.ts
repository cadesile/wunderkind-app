// ─── Player statistics types ──────────────────────────────────────────────────

/**
 * Per-player, per-club, per-league, per-season stat record.
 * Stored in leagueStatsStore keyed by composite key:
 *   `${playerId}:${clubId}:${leagueId}:${season}`
 */
export interface PlayerSeasonStats {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  /** League tier (1 = top flight). Used to partition AsyncStorage keys by tier+season. */
  tier: number;
  goals: number;
  assists: number;
  appearances: number;
  /** Running average — recalculated on each match record. */
  averageRating: number;
}

/**
 * Aggregated career totals for a player across all seasons, clubs, and leagues.
 * Returned by `getPlayerCareerTotals`, `getClubStats`, and `getLeagueStats`.
 */
export interface PlayerCareerTotals {
  playerId: string;
  goals: number;
  assists: number;
  appearances: number;
  /** Weighted average across all aggregated records. */
  averageRating: number;
}
