import type { SQLiteDatabase } from 'expo-sqlite';
import type { StatsInsertEntry, TopScorerRow } from '@/db/types';
import type { PlayerCareerTotals, PlayerSeasonStats } from '@/types/stats';

export async function batchUpsertStats(
  db: SQLiteDatabase,
  entries: StatsInsertEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT INTO player_season_stats
           (player_id, club_id, league_id, season, tier, appearances, goals, assists, avg_rating)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(player_id, club_id, league_id, season) DO UPDATE SET
           appearances = appearances + 1,
           goals = goals + excluded.goals,
           assists = assists + excluded.assists,
           avg_rating = (avg_rating * appearances + excluded.avg_rating) / (appearances + 1)`,
        [e.playerId, e.clubId, e.leagueId, e.season, e.tier, e.goals, e.assists, e.rating],
      );
    }
  });
}

export async function getPlayerCareerTotals(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerCareerTotals | null> {
  const row = await db.getFirstAsync<{
    appearances: number;
    goals: number;
    assists: number;
    avg_rating: number;
  }>(
    `SELECT SUM(appearances) as appearances, SUM(goals) as goals, SUM(assists) as assists,
            AVG(avg_rating) as avg_rating
     FROM player_season_stats WHERE player_id = ?`,
    [playerId],
  );
  if (!row || row.appearances === null) return null;
  return {
    playerId,
    appearances: row.appearances,
    goals: row.goals,
    assists: row.assists,
    averageRating: Math.round(row.avg_rating * 10) / 10,
  };
}

export async function getPlayerSeasonStats(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerSeasonStats[]> {
  const rows = await db.getAllAsync<{
    season: number;
    club_id: string;
    league_id: string;
    tier: number;
    appearances: number;
    goals: number;
    assists: number;
    avg_rating: number;
  }>(
    `SELECT season, club_id, league_id, tier, appearances, goals, assists, avg_rating
     FROM player_season_stats WHERE player_id = ? ORDER BY season DESC`,
    [playerId],
  );
  return rows.map((r) => ({
    playerId,
    season: r.season,
    clubId: r.club_id,
    leagueId: r.league_id,
    tier: r.tier,
    appearances: r.appearances,
    goals: r.goals,
    assists: r.assists,
    averageRating: r.avg_rating,
  }));
}

function mapTopScorerRow(r: {
  player_id: string;
  goals: number;
  assists: number;
  appearances: number;
  avg_rating: number;
}): TopScorerRow {
  return {
    playerId: r.player_id,
    goals: r.goals,
    assists: r.assists,
    appearances: r.appearances,
    averageRating: r.avg_rating,
  };
}

export async function getLeagueTopScorers(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
  limit = 10,
): Promise<TopScorerRow[]> {
  const rows = await db.getAllAsync<{
    player_id: string;
    goals: number;
    assists: number;
    appearances: number;
    avg_rating: number;
  }>(
    `SELECT player_id, goals, assists, appearances, avg_rating
     FROM player_season_stats
     WHERE league_id = ? AND season = ?
     ORDER BY goals DESC, assists DESC
     LIMIT ?`,
    [leagueId, season, limit],
  );
  return rows.map(mapTopScorerRow);
}

export async function getLeagueTopAssisters(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
  limit = 10,
): Promise<TopScorerRow[]> {
  const rows = await db.getAllAsync<{
    player_id: string;
    goals: number;
    assists: number;
    appearances: number;
    avg_rating: number;
  }>(
    `SELECT player_id, goals, assists, appearances, avg_rating
     FROM player_season_stats
     WHERE league_id = ? AND season = ?
     ORDER BY assists DESC, goals DESC
     LIMIT ?`,
    [leagueId, season, limit],
  );
  return rows.map(mapTopScorerRow);
}

export async function getClubTopScorer(
  db: SQLiteDatabase,
  clubId: string,
): Promise<TopScorerRow | null> {
  const row = await db.getFirstAsync<{
    player_id: string;
    goals: number;
    assists: number;
    appearances: number;
    avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) as goals, SUM(assists) as assists,
            SUM(appearances) as appearances, AVG(avg_rating) as avg_rating
     FROM player_season_stats WHERE club_id = ?
     GROUP BY player_id ORDER BY goals DESC LIMIT 1`,
    [clubId],
  );
  if (!row) return null;
  return mapTopScorerRow(row);
}

export async function getClubTopAssister(
  db: SQLiteDatabase,
  clubId: string,
): Promise<TopScorerRow | null> {
  const row = await db.getFirstAsync<{
    player_id: string;
    goals: number;
    assists: number;
    appearances: number;
    avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) as goals, SUM(assists) as assists,
            SUM(appearances) as appearances, AVG(avg_rating) as avg_rating
     FROM player_season_stats WHERE club_id = ?
     GROUP BY player_id ORDER BY assists DESC LIMIT 1`,
    [clubId],
  );
  if (!row) return null;
  return mapTopScorerRow(row);
}
