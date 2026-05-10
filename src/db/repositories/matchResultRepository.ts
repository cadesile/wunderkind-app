import type { SQLiteDatabase } from 'expo-sqlite';
import type { MatchResultRecord, PlayerMatchStats } from '@/db/types';

// ─── Raw DB Row ───────────────────────────────────────────────────────────────

interface RawRow {
  fixture_id: string;
  season: number;
  home_club_id: string;
  away_club_id: string;
  home_goals: number;
  away_goals: number;
  home_avg_rating: number | null;
  away_avg_rating: number | null;
  home_players: string; // JSON array of PlayerMatchStats
  away_players: string; // JSON array of PlayerMatchStats
  played_at: string;
}

function rowToRecord(row: RawRow): MatchResultRecord {
  return {
    fixtureId: row.fixture_id,
    season: row.season,
    homeClubId: row.home_club_id,
    awayClubId: row.away_club_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    homeAvgRating: row.home_avg_rating ?? 0,
    awayAvgRating: row.away_avg_rating ?? 0,
    homePlayers: safeParseJson<PlayerMatchStats[]>(row.home_players, []),
    awayPlayers: safeParseJson<PlayerMatchStats[]>(row.away_players, []),
    playedAt: row.played_at,
  };
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function batchInsertResults(
  db: SQLiteDatabase,
  records: MatchResultRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const r of records) {
      await db.runAsync(
        `INSERT OR IGNORE INTO match_results
           (fixture_id, season, home_club_id, away_club_id, home_goals, away_goals,
            home_avg_rating, away_avg_rating, home_players, away_players, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.fixtureId,
          r.season,
          r.homeClubId,
          r.awayClubId,
          r.homeGoals,
          r.awayGoals,
          r.homeAvgRating ?? null,
          r.awayAvgRating ?? null,
          JSON.stringify(r.homePlayers ?? []),
          JSON.stringify(r.awayPlayers ?? []),
          r.playedAt,
        ],
      );
    }
  });
}

export async function getByFixtureId(
  db: SQLiteDatabase,
  fixtureId: string,
): Promise<MatchResultRecord | null> {
  const row = await db.getFirstAsync<RawRow>(
    `SELECT * FROM match_results WHERE fixture_id = ?`,
    [fixtureId],
  );
  if (!row) return null;
  return rowToRecord(row);
}

export async function getSeasonResults(
  db: SQLiteDatabase,
  clubId: string,
  season: number,
): Promise<MatchResultRecord[]> {
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM match_results
     WHERE (home_club_id = ? OR away_club_id = ?) AND season = ?
     ORDER BY played_at`,
    [clubId, clubId, season],
  );
  return rows.map(rowToRecord);
}
