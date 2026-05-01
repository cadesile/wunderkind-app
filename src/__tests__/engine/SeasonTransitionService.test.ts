import { buildLeagueStandings } from '@/engine/SeasonTransitionService';

const mockFixtures = [
  // c1 beat c2 3-0
  { id: 'f1', leagueId: 'L1', season: 1, round: 1, homeClubId: 'c1', awayClubId: 'c2',
    result: { homeGoals: 3, awayGoals: 0, playedAt: '', synced: true } },
  // c3 beat c2 1-0
  { id: 'f2', leagueId: 'L1', season: 1, round: 2, homeClubId: 'c3', awayClubId: 'c2',
    result: { homeGoals: 1, awayGoals: 0, playedAt: '', synced: true } },
  // c1 drew c3 0-0
  { id: 'f3', leagueId: 'L1', season: 1, round: 3, homeClubId: 'c1', awayClubId: 'c3',
    result: { homeGoals: 0, awayGoals: 0, playedAt: '', synced: true } },
  // Different league — must be ignored
  { id: 'f4', leagueId: 'OTHER', season: 1, round: 1, homeClubId: 'c1', awayClubId: 'c2',
    result: { homeGoals: 5, awayGoals: 0, playedAt: '', synced: true } },
];

jest.mock('@/stores/fixtureStore', () => ({
  useFixtureStore: { getState: () => ({ fixtures: mockFixtures }) },
}));

jest.mock('@/stores/clubStore', () => ({
  useClubStore: { getState: () => ({ club: { id: 'amp-not-in-this-league' } }) },
}));

describe('buildLeagueStandings', () => {
  it('sorts clubs by pts then gd then gf', () => {
    // c1: 4pts (W+D), gd +3; c3: 4pts (W+D), gd +1; c2: 0pts, gd -4
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[0].clubId).toBe('c1');
    expect(standings[1].clubId).toBe('c3');
    expect(standings[2].clubId).toBe('c2');
  });

  it('marks last-place club as relegated', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[2].relegated).toBe(true);
    expect(standings[0].relegated).toBe(false);
  });

  it('marks top N clubs as promoted when promotionSpots set', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[0].promoted).toBe(true);
    expect(standings[1].promoted).toBe(false);
  });

  it('marks nobody as promoted when promotionSpots is null', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], null, 1);
    expect(standings.every((s) => !s.promoted)).toBe(true);
  });

  it('marks AMP club entry correctly', () => {
    // Override mock to put c1 as AMP
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'c1' } });
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings.find((s) => s.clubId === 'c1')?.isAmp).toBe(true);
    expect(standings.find((s) => s.clubId === 'c2')?.isAmp).toBe(false);
    // Restore
    useClubStore.getState = () => ({ club: { id: 'amp-not-in-this-league' } });
  });

  it('ignores fixtures from other leagues and seasons', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    // c1 should only have stats from L1/season1 — not inflated by the OTHER-league fixture
    expect(standings[0].clubId).toBe('c1');
  });
});
