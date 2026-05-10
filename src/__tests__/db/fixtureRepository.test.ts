import {
  batchInsertFixtures,
  loadSeasonFixtures,
  batchUpdateResults,
} from '@/db/repositories/fixtureRepository';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

describe('batchInsertFixtures', () => {
  it('does nothing when fixtures array is empty', async () => {
    const db = createMockDb();
    await batchInsertFixtures(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('inserts one row per fixture', async () => {
    const db = createMockDb();
    const fixture = {
      id: 'fix1', leagueId: 'l1', season: 1, round: 1,
      homeClubId: 'c1', awayClubId: 'c2',
    };
    await batchInsertFixtures(db as any, [fixture as any]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO fixtures'),
      expect.arrayContaining(['fix1', 'l1', 1, 1, 'c1', 'c2']),
    );
  });
});

describe('loadSeasonFixtures', () => {
  it('returns empty array when no fixtures', async () => {
    const db = createMockDb();
    const result = await loadSeasonFixtures(db as any, 'l1', 1);
    expect(result).toEqual([]);
  });

  it('returns fixtures for the given league and season', async () => {
    const db = createMockDb();
    db.getAllAsync.mockResolvedValue([
      { id: 'fix1', league_id: 'l1', season: 1, round: 1,
        home_club_id: 'c1', away_club_id: 'c2',
        home_goals: null, away_goals: null, played_at: null, synced: 0 },
    ]);
    const result = await loadSeasonFixtures(db as any, 'l1', 1);
    expect(result).toHaveLength(1);
  });
});

describe('batchUpdateResults', () => {
  it('does nothing when entries array is empty', async () => {
    const db = createMockDb();
    await batchUpdateResults(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('updates fixture result columns', async () => {
    const db = createMockDb();
    await batchUpdateResults(db as any, [
      { fixtureId: 'fix1', homeGoals: 2, awayGoals: 1, playedAt: '2024-01-01' },
    ]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE fixtures SET'),
      expect.arrayContaining([2, 1, '2024-01-01', 'fix1']),
    );
  });
});
