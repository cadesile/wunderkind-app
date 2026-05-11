import type { SQLiteDatabase } from 'expo-sqlite';
import type { WorldClub, WorldPlayer } from '@/types/world';

/** Strip per-match appearance history before writing. */
function stripAppearances(club: WorldClub): WorldClub {
  return {
    ...club,
    players: club.players.map(({ appearances: _a, ...p }) => p as WorldPlayer),
  };
}

const UPSERT_SQL = `
  INSERT INTO world_clubs (id, league_id, data)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    league_id = excluded.league_id,
    data      = excluded.data
`;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Upsert a single club. Updates its league assignment if it moved. */
export async function upsertClub(
  db: SQLiteDatabase,
  club: WorldClub,
  leagueId: string,
): Promise<void> {
  await db.runAsync(UPSERT_SQL, [club.id, leagueId, JSON.stringify(stripAppearances(club))]);
}

/** Batch-upsert all clubs for a league inside a single transaction. */
export async function upsertClubs(
  db: SQLiteDatabase,
  leagueId: string,
  clubs: WorldClub[],
): Promise<void> {
  if (clubs.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const club of clubs) {
      await db.runAsync(UPSERT_SQL, [club.id, leagueId, JSON.stringify(stripAppearances(club))]);
    }
  });
}

/** Load every club from SQLite into a flat id→club map. */
export async function loadAllClubs(
  db: SQLiteDatabase,
): Promise<Record<string, WorldClub>> {
  const rows = await db.getAllAsync<{ id: string; data: string }>(
    `SELECT id, data FROM world_clubs`,
  );
  const clubs: Record<string, WorldClub> = {};
  for (const row of rows) {
    try {
      clubs[row.id] = JSON.parse(row.data) as WorldClub;
    } catch {
      console.warn(`[worldClubRepository] Failed to parse club ${row.id}`);
    }
  }
  return clubs;
}
