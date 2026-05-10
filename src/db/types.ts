// ─── Re-exports from existing type modules ────────────────────────────────────

export type { MatchAppearance, PlayerAppearances } from '@/types/player';
export type { Fixture, FixtureResult } from '@/stores/fixtureStore';
export type { MatchResultRecord } from '@/stores/matchResultStore';
export type { PlayerSeasonStats, PlayerCareerTotals } from '@/types/stats';

// ─── Repository input / output types ─────────────────────────────────────────

/** Input row for batchInsertAppearances */
export interface AppearanceInsertEntry {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  tier: number;
  fixtureId: string;
  week: number;
  opponentId: string;
  result: 'win' | 'loss' | 'draw';
  scoreline: string;
  goals: number;
  assists: number;
  minutes: number;
  rating: number;
  position?: string;
}

/** Input row for batchUpsertStats — one entry per player per fixture */
export interface StatsInsertEntry {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  tier: number;
  goals: number;
  assists: number;
  rating: number;
}

/** Aggregated row returned by top-scorer / top-assister queries */
export interface TopScorerRow {
  playerId: string;
  goals: number;
  assists: number;
  appearances: number;
  averageRating: number;
}

export interface FixtureResultEntry {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  playedAt: string;
}
