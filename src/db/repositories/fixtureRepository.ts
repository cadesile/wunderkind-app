import type { SQLiteDatabase } from 'expo-sqlite';
import type { FixtureResultEntry } from '@/db/types';
import type { Fixture } from '@/stores/fixtureStore';

// Raw SQLite row shape — snake_case columns
interface FixtureRow {
  id: string;
  league_id: string;
  season: number;
  round: number;
  home_club_id: string;
  away_club_id: string;
  home_goals: number | null;
  away_goals: number | null;
  played_at: string | null;
  synced: number;
}

function rowToFixture(row: FixtureRow): Fixture {
  return {
    id: row.id,
    leagueId: row.league_id,
    season: row.season,
    round: row.round,
    homeClubId: row.home_club_id,
    awayClubId: row.away_club_id,
    result:
      row.home_goals !== null && row.away_goals !== null && row.played_at !== null
        ? {
            homeGoals: row.home_goals,
            awayGoals: row.away_goals,
            playedAt: row.played_at,
            synced: row.synced === 1,
          }
        : null,
  };
}

export async function batchInsertFixtures(
  db: SQLiteDatabase,
  fixtures: Fixture[],
): Promise<void> {
  if (fixtures.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const f of fixtures) {
      await db.runAsync(
        `INSERT OR IGNORE INTO fixtures
           (id, league_id, season, round, home_club_id, away_club_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [f.id, f.leagueId, f.season, f.round, f.homeClubId, f.awayClubId],
      );
    }
  });
}

export async function loadSeasonFixtures(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
): Promise<Fixture[]> {
  const rows = await db.getAllAsync<FixtureRow>(
    `SELECT id, league_id, season, round, home_club_id, away_club_id,
            home_goals, away_goals, played_at, synced
     FROM fixtures WHERE league_id = ? AND season = ? ORDER BY round`,
    [leagueId, season],
  );
  return rows.map(rowToFixture);
}

export async function batchUpdateResults(
  db: SQLiteDatabase,
  entries: FixtureResultEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `UPDATE fixtures SET home_goals = ?, away_goals = ?, played_at = ? WHERE id = ?`,
        [e.homeGoals, e.awayGoals, e.playedAt, e.fixtureId],
      );
    }
  });
}

export async function getUnsyncedResults(db: SQLiteDatabase): Promise<Fixture[]> {
  const rows = await db.getAllAsync<FixtureRow>(
    `SELECT id, league_id, season, round, home_club_id, away_club_id,
            home_goals, away_goals, played_at, synced
     FROM fixtures WHERE synced = 0 AND home_goals IS NOT NULL`,
    [],
  );
  return rows.map(rowToFixture);
}

export async function markSynced(db: SQLiteDatabase, fixtureIds: string[]): Promise<void> {
  if (fixtureIds.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const id of fixtureIds) {
      await db.runAsync(`UPDATE fixtures SET synced = 1 WHERE id = ?`, [id]);
    }
  });
}
