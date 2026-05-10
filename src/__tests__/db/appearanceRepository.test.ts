import {
  batchInsertAppearances,
  loadPlayerAppearances,
} from '@/db/repositories/appearanceRepository';
import type { AppearanceInsertEntry } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const entry: AppearanceInsertEntry = {
  playerId: 'p1', clubId: 'c1', leagueId: 'l1', season: 1, tier: 5,
  fixtureId: 'f1', week: 3, opponentId: 'c2', result: 'win', scoreline: '2-1',
  goals: 1, assists: 0, minutes: 90, rating: 7.5,
};

describe('batchInsertAppearances', () => {
  it('does nothing when entries array is empty', async () => {
    const db = createMockDb();
    await batchInsertAppearances(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('calls runAsync once per entry inside a transaction', async () => {
    const db = createMockDb();
    await batchInsertAppearances(db as any, [entry]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO appearances'),
      ['p1', 'c1', 'l1', 1, 5, 'f1', 3, 'c2', 'win', '2-1', 1, 0, 90, 7.5, null],
    );
  });
});

describe('loadPlayerAppearances', () => {
  it('returns empty object when no rows found', async () => {
    const db = createMockDb();
    const result = await loadPlayerAppearances(db as any, 'p1');
    expect(result).toEqual({});
  });

  it('groups rows into PlayerAppearances structure', async () => {
    const db = createMockDb();
    db.getAllAsync.mockResolvedValue([
      { season: 1, club_id: 'c1', opponent_id: 'c2', result: 'win', scoreline: '2-1', goals: 1, assists: 0, rating: 7.5 },
    ]);
    const result = await loadPlayerAppearances(db as any, 'p1');
    expect(result['Season 1']['c1']).toHaveLength(1);
    expect(result['Season 1']['c1'][0]).toEqual({
      opponentId: 'c2', result: 'win', scoreline: '2-1', goals: 1, assists: 0, rating: 7.5,
    });
  });
});
