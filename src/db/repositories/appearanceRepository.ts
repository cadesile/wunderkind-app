import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppearanceInsertEntry } from '@/db/types';
import type { MatchAppearance, PlayerAppearances } from '@/types/player';

export async function batchInsertAppearances(
  db: SQLiteDatabase,
  entries: AppearanceInsertEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT OR IGNORE INTO appearances
           (player_id, club_id, league_id, season, tier, fixture_id, week,
            opponent_id, result, scoreline, goals, assists, minutes, rating, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.playerId, e.clubId, e.leagueId, e.season, e.tier, e.fixtureId, e.week,
         e.opponentId, e.result, e.scoreline, e.goals, e.assists, e.minutes, e.rating,
         e.position ?? null],
      );
    }
  });
}

interface AppearanceRow {
  season: number;
  club_id: string;
  opponent_id: string;
  result: string;
  scoreline: string;
  goals: number;
  assists: number;
  rating: number;
}

export async function loadPlayerAppearances(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerAppearances> {
  const rows = await db.getAllAsync<AppearanceRow>(
    `SELECT season, club_id, opponent_id, result, scoreline, goals, assists, rating
     FROM appearances WHERE player_id = ? ORDER BY season, week`,
    [playerId],
  );

  const out: PlayerAppearances = {};
  for (const row of rows) {
    const seasonKey = `Season ${row.season}`;
    if (!out[seasonKey]) out[seasonKey] = {};
    if (!out[seasonKey][row.club_id]) out[seasonKey][row.club_id] = [];
    out[seasonKey][row.club_id].push({
      opponentId: row.opponent_id,
      result:     row.result as MatchAppearance['result'],
      scoreline:  row.scoreline,
      goals:      row.goals,
      assists:    row.assists,
      rating:     row.rating,
    });
  }
  return out;
}

export interface RecentAppearanceRow {
  player_id: string;
  week: number;
  rating: number;
  goals: number;
  assists: number;
  result: string;
  scoreline: string;
}

/** Load all appearances for a club ordered most-recent first, for in-form calculations. */
export async function loadClubRecentPlayerAppearances(
  db: SQLiteDatabase,
  clubId: string,
): Promise<RecentAppearanceRow[]> {
  return db.getAllAsync<RecentAppearanceRow>(
    `SELECT player_id, week, rating, goals, assists, result, scoreline
     FROM appearances WHERE club_id = ? ORDER BY week DESC`,
    [clubId],
  );
}

export async function loadClubSeasonAppearances(
  db: SQLiteDatabase,
  clubId: string,
  season: number,
): Promise<AppearanceRow[]> {
  return db.getAllAsync<AppearanceRow>(
    `SELECT season, club_id, opponent_id, result, scoreline, goals, assists, rating
     FROM appearances WHERE club_id = ? AND season = ? ORDER BY week`,
    [clubId, season],
  );
}
