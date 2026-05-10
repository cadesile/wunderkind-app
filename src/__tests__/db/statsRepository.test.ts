import {
  batchUpsertStats,
  getPlayerCareerTotals,
  getLeagueTopScorers,
  getClubTopScorer,
} from '@/db/repositories/statsRepository';
import type { StatsInsertEntry } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const entry: StatsInsertEntry = {
  playerId: 'p1', clubId: 'c1', leagueId: 'l1', season: 1, tier: 5,
  goals: 2, assists: 1, rating: 7.5,
};

describe('batchUpsertStats', () => {
  it('does nothing when entries array is empty', async () => {
    const db = createMockDb();
    await batchUpsertStats(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('calls runAsync with additive upsert SQL', async () => {
    const db = createMockDb();
    await batchUpsertStats(db as any, [entry]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = (db.runAsync.mock.calls[0] as any[])[0];
    expect(sql).toContain('INSERT INTO player_season_stats');
    expect(sql).toContain('ON CONFLICT');
    expect(sql).toContain('appearances = appearances + 1');
    expect(sql).toContain('goals = goals + excluded.goals');
  });
});

describe('getPlayerCareerTotals', () => {
  it('returns null when no rows exist', async () => {
    const db = createMockDb();
    const result = await getPlayerCareerTotals(db as any, 'p1');
    expect(result).toBeNull();
  });

  it('returns aggregated totals when rows exist', async () => {
    const db = createMockDb();
    db.getFirstAsync.mockResolvedValue({ appearances: 10, goals: 5, assists: 3, avg_rating: 7.2 });
    const result = await getPlayerCareerTotals(db as any, 'p1');
    expect(result).not.toBeNull();
    expect(result!.appearances).toBe(10);
    expect(result!.goals).toBe(5);
  });
});

describe('getLeagueTopScorers', () => {
  it('returns empty array when no data', async () => {
    const db = createMockDb();
    const result = await getLeagueTopScorers(db as any, 'l1', 1);
    expect(result).toEqual([]);
  });

  it('returns rows mapped to TopScorerRow', async () => {
    const db = createMockDb();
    db.getAllAsync.mockResolvedValue([
      { player_id: 'p1', goals: 10, assists: 2, appearances: 20, avg_rating: 7.5 },
    ]);
    const result = await getLeagueTopScorers(db as any, 'l1', 1, 10);
    expect(result[0]).toEqual({ playerId: 'p1', goals: 10, assists: 2, appearances: 20, averageRating: 7.5 });
  });
});

describe('getClubTopScorer', () => {
  it('returns null when no data', async () => {
    const db = createMockDb();
    const result = await getClubTopScorer(db as any, 'c1');
    expect(result).toBeNull();
  });
});
