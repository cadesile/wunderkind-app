import {
  buildLeagueStandings,
  buildPyramidPayload,
  buildLeagueSnapshot,
} from '@/engine/SeasonTransitionService';
import type { WorldLeague, SeasonUpdateLeague } from '@/types/world';

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

// Used by applySeasonResponse tests (Task 3)
const mockApplySeasonUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('@/stores/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      clubs: {
        'c1': { id: 'c1', name: 'Club One', reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#000', stadiumName: null, facilities: {} },
      },
      leagues: [],
      applySeasonUpdate: mockApplySeasonUpdate,
    }),
  },
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

  it('does not relegate any club in a single-club league', () => {
    const standings = buildLeagueStandings('L1', ['c1'], null, 1);
    expect(standings[0].relegated).toBe(false);
  });
});

const mockWorldLeagues: WorldLeague[] = [
  { id: 'L1', tier: 1, name: 'Top', country: 'BR', promotionSpots: null, reputationTier: 'elite', clubIds: ['c2', 'c3'] },
  { id: 'L2', tier: 2, name: 'Second', country: 'BR', promotionSpots: 1, reputationTier: 'national', clubIds: ['c4', 'c5'] },
];

describe('buildPyramidPayload', () => {
  beforeEach(() => {
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1' } });
  });

  afterEach(() => {
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp-not-in-this-league' } });
  });

  it('returns one PyramidLeague per world league', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    expect(payload).toHaveLength(2);
    expect(payload.map((l) => l.leagueId)).toEqual(['L1', 'L2']);
  });

  it('includes AMP club id in its league clubIds', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    const ampLeague = payload.find((l) => l.leagueId === 'L2')!;
    expect(ampLeague.standings.some((s) => s.clubId === 'amp1')).toBe(true);
  });

  it('does not include AMP in other league standings', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    const otherLeague = payload.find((l) => l.leagueId === 'L1')!;
    expect(otherLeague.standings.some((s) => s.clubId === 'amp1')).toBe(false);
  });
});

const mockSeasonLeague: SeasonUpdateLeague = {
  id: 'L8',
  tier: 8,
  name: 'League 8',
  country: 'BR',
  promotionSpots: 1,
  reputationTier: 'local',
  tvDeal: 500000,
  sponsorPot: 18329782,
  prizeMoney: 500000,
  leaguePositionPot: 500000,
  leaguePositionDecreasePercent: 8,
  clubs: [
    { clubId: 'c1', isAmp: false, promoted: false, relegated: true },
    { clubId: 'amp1', isAmp: true, promoted: false, relegated: false },
    { clubId: 'c99', isAmp: false, promoted: true, relegated: false },
  ],
  fixtures: [],
};

describe('buildLeagueSnapshot', () => {
  it('excludes the AMP club from the clubs array', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.clubs.every((c) => c.id !== 'amp1')).toBe(true);
  });

  it('includes all NPC clubs regardless of promoted/relegated flags', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.clubs).toHaveLength(2);
    expect(snapshot.clubs.find((c) => c.id === 'c1')).toBeDefined();
    expect(snapshot.clubs.find((c) => c.id === 'c99')).toBeDefined();
  });

  it('sets correct league metadata', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.id).toBe('L8');
    expect(snapshot.tier).toBe(8);
    expect(snapshot.season).toBe(2);
    expect(snapshot.reputationTier).toBe('local');
    expect(snapshot.reputationCap).toBe(14);
  });

  it('uses worldStore club data for name and colors', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    const club = snapshot.clubs.find((c) => c.id === 'c1')!;
    expect(club.name).toBe('Club One');
    expect(club.primaryColor).toBe('#ff0000');
  });

  it('falls back to clubId as name when worldStore has no data', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    const unknown = snapshot.clubs.find((c) => c.id === 'c99')!;
    expect(unknown.name).toBe('c99');
    expect(unknown.primaryColor).toBe('#888888');
  });
});
