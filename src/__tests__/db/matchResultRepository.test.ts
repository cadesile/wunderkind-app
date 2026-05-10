import {
  batchInsertResults,
  getByFixtureId,
  getSeasonResults,
} from '@/db/repositories/matchResultRepository';
import type { MatchResultRecord } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

function buildMinimalRecord(): MatchResultRecord {
  return {
    fixtureId: 'fixture-001',
    season: 1,
    homeClubId: 'club-home',
    awayClubId: 'club-away',
    homeGoals: 2,
    awayGoals: 1,
    homeAvgRating: 7.5,
    awayAvgRating: 6.8,
    homePlayers: [
      { id: 'p1', name: 'Alice', position: 'GK', rating: 8.0, goals: 0, assists: 0 },
    ],
    awayPlayers: [
      { id: 'p2', name: 'Bob', position: 'FWD', rating: 6.5, goals: 1, assists: 0 },
    ],
    playedAt: '2025-01-10T15:00:00.000Z',
  };
}

describe('batchInsertResults', () => {
  it('does nothing when records array is empty', async () => {
    const db = createMockDb();
    await batchInsertResults(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('inserts one row per record', async () => {
    const db = createMockDb();
    const record = buildMinimalRecord();
    await batchInsertResults(db as any, [record]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO match_results'),
      expect.any(Array),
    );
  });
});

describe('getByFixtureId', () => {
  it('returns null when fixture not found', async () => {
    const db = createMockDb();
    const result = await getByFixtureId(db as any, 'f1');
    expect(result).toBeNull();
  });
});

describe('getSeasonResults', () => {
  it('returns empty array when no results', async () => {
    const db = createMockDb();
    const result = await getSeasonResults(db as any, 'c1', 1);
    expect(result).toEqual([]);
  });
});
