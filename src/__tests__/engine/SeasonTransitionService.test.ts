import {
  buildLeagueStandings,
  buildPyramidPayload,
  buildLeagueSnapshot,
  applySeasonResponse,
} from '@/engine/SeasonTransitionService';
import type { WorldLeague, SeasonUpdateLeague } from '@/types/world';
import type { LeagueSnapshot } from '@/types/api';

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

const mockClearSeason = jest.fn();
const mockLoadFromServerSchedule = jest.fn();

jest.mock('@/stores/fixtureStore', () => ({
  useFixtureStore: {
    getState: () => ({
      fixtures: mockFixtures,
      clearSeason: mockClearSeason,
      loadFromServerSchedule: mockLoadFromServerSchedule,
    }),
  },
}));

jest.mock('@/stores/clubStore', () => ({
  useClubStore: { getState: () => ({ club: { id: 'amp-not-in-this-league' } }) },
}));

// Used by applySeasonResponse tests (Task 3)
const mockApplySeasonUpdate = jest.fn().mockResolvedValue(undefined);
const mockSetFromSync = jest.fn();
const mockAddMessage = jest.fn();

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

jest.mock('@/stores/leagueStore', () => ({
  useLeagueStore: { getState: () => ({ setFromSync: mockSetFromSync }) },
}));

jest.mock('@/stores/inboxStore', () => ({
  useInboxStore: { getState: () => ({ addMessage: mockAddMessage }) },
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

// ─── Test data shared across applySeasonResponse tests ───────────────────────

const twoLeagueResponse: SeasonUpdateLeague[] = [
  {
    id: 'L7', tier: 7, name: 'League 7', country: 'BR', promotionSpots: 1,
    reputationTier: 'local', tvDeal: 1000000, sponsorPot: 0, prizeMoney: 0,
    leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
    clubs: [
      { clubId: 'c10', isAmp: false, promoted: false, relegated: true },
      { clubId: 'c11', isAmp: false, promoted: true, relegated: false },
    ],
    fixtures: [[['c10', 'c11']]],
  },
  {
    id: 'L8', tier: 8, name: 'League 8', country: 'BR', promotionSpots: 1,
    reputationTier: 'local', tvDeal: 500000, sponsorPot: 0, prizeMoney: 0,
    leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
    clubs: [
      { clubId: 'amp1', isAmp: true, promoted: false, relegated: false },
      { clubId: 'c12', isAmp: false, promoted: false, relegated: true },
    ],
    fixtures: [[['amp1', 'c12']]],
  },
];

const mockCurrentLeague: LeagueSnapshot = {
  id: 'L8', tier: 8, name: 'League 8', country: 'BR', season: 1,
  promotionSpots: 1, reputationTier: 'local', reputationCap: 14,
  tvDeal: 500000, sponsorPot: 0, prizeMoney: 0, leaguePositionPot: 0,
  leaguePositionDecreasePercent: 8, clubs: [],
};

describe('applySeasonResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useWorldStore } = jest.requireMock('@/stores/worldStore');
    useWorldStore.getState = () => ({
      clubs: { 'c1': { id: 'c1', name: 'Club One', reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#000', stadiumName: null, facilities: {} } },
      leagues: [],
      applySeasonUpdate: mockApplySeasonUpdate,
    });
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 10 } });
  });

  it('calls worldStore.applySeasonUpdate with the response leagues', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockApplySeasonUpdate).toHaveBeenCalledWith(twoLeagueResponse);
  });

  it('calls leagueStore.setFromSync with a LeagueSnapshot for the AMP league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockSetFromSync).toHaveBeenCalledTimes(1);
    const snapshot = mockSetFromSync.mock.calls[0][0];
    expect(snapshot.id).toBe('L8');
    expect(snapshot.season).toBe(2);
  });

  it('does NOT add an inbox message when AMP stays in the same league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockAddMessage).not.toHaveBeenCalled();
  });

  it('adds a PROMOTED inbox message when AMP moves to a lower-tier-number league', async () => {
    const promotedLeagueResponse: SeasonUpdateLeague[] = [
      {
        id: 'L7', tier: 7, name: 'League 7', country: 'BR', promotionSpots: 1,
        reputationTier: 'local', tvDeal: 1000000, sponsorPot: 0, prizeMoney: 0,
        leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
        clubs: [
          { clubId: 'amp1', isAmp: true, promoted: true, relegated: false },
          { clubId: 'c11', isAmp: false, promoted: false, relegated: false },
        ],
        fixtures: [],
      },
      {
        id: 'L8', tier: 8, name: 'League 8', country: 'BR', promotionSpots: 1,
        reputationTier: 'local', tvDeal: 500000, sponsorPot: 0, prizeMoney: 0,
        leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
        clubs: [{ clubId: 'c12', isAmp: false, promoted: false, relegated: true }],
        fixtures: [],
      },
    ];
    await applySeasonResponse(promotedLeagueResponse, mockCurrentLeague, 2);
    expect(mockAddMessage).toHaveBeenCalledTimes(1);
    expect(mockAddMessage.mock.calls[0][0].body).toContain('promoted');
  });

  it('clears fixtures then loads server schedule for every response league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockClearSeason).toHaveBeenCalledTimes(1);
    expect(mockLoadFromServerSchedule).toHaveBeenCalledTimes(2);
    expect(mockLoadFromServerSchedule).toHaveBeenCalledWith('L7', 2, twoLeagueResponse[0].fixtures);
    expect(mockLoadFromServerSchedule).toHaveBeenCalledWith('L8', 2, twoLeagueResponse[1].fixtures);
    expect(mockClearSeason.mock.invocationCallOrder[0])
      .toBeLessThan(mockLoadFromServerSchedule.mock.invocationCallOrder[0]);
  });

  it('adds a RELEGATED inbox message when AMP moves to a higher-tier-number league', async () => {
    const relegatedLeagueResponse: SeasonUpdateLeague[] = [
      {
        id: 'L9', tier: 9, name: 'League 9', country: 'BR', promotionSpots: 1,
        reputationTier: 'local', tvDeal: 250000, sponsorPot: 0, prizeMoney: 0,
        leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
        clubs: [
          { clubId: 'amp1', isAmp: true, promoted: false, relegated: true },
          { clubId: 'c13', isAmp: false, promoted: false, relegated: false },
        ],
        fixtures: [],
      },
      {
        id: 'L8', tier: 8, name: 'League 8', country: 'BR', promotionSpots: 1,
        reputationTier: 'local', tvDeal: 500000, sponsorPot: 0, prizeMoney: 0,
        leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
        clubs: [{ clubId: 'c12', isAmp: false, promoted: false, relegated: false }],
        fixtures: [],
      },
    ];
    // currentLeague is mockCurrentLeague (L8 tier 8); AMP now in L9 tier 9 = relegated
    await applySeasonResponse(relegatedLeagueResponse, mockCurrentLeague, 2);
    expect(mockAddMessage).toHaveBeenCalledTimes(1);
    expect(mockAddMessage.mock.calls[0][0].body).toContain('relegated');
  });
});

// ─── Task 4 mocks ─────────────────────────────────────────────────────────────
import {
  distributeSeasonFinances,
  recordSeasonHistory,
  performSeasonTransition,
} from '@/engine/SeasonTransitionService';
import type { SeasonTransitionSnapshot, SeasonStanding } from '@/engine/SeasonTransitionService';

// These are lazily resolved via jest.requireMock — hoisting-safe
const mockAddTransaction = jest.fn();
const mockAddSeasonRecord = jest.fn();
const mockConcludeSeason = jest.fn();

jest.mock('@/stores/financeStore', () => {
  const _addTransaction = jest.fn();
  const _state = { addTransaction: _addTransaction };
  return { useFinanceStore: { getState: () => _state } };
});
jest.mock('@/stores/leagueHistoryStore', () => {
  const _addSeasonRecord = jest.fn();
  const _state = { addSeasonRecord: _addSeasonRecord };
  return { useLeagueHistoryStore: { getState: () => _state } };
});
jest.mock('@/api/endpoints/season', () => ({
  concludeSeason: jest.fn(),
}));

const league8: LeagueSnapshot = {
  id: 'L8', tier: 8, name: 'League 8', country: 'BR', season: 1,
  promotionSpots: 1, reputationTier: 'local', reputationCap: 14,
  tvDeal: 500000, sponsorPot: 18329782, prizeMoney: 500000,
  leaguePositionPot: 500000, leaguePositionDecreasePercent: 8, clubs: [],
};

const mockStandings: SeasonStanding[] = [
  { id: 'amp1', name: 'My Club', primaryColor: '#0f0', pts: 20, gd: 10, gf: 15, ga: 5, played: 10, wins: 6, draws: 2, losses: 2 },
  { id: 'c12', name: 'Rival', primaryColor: '#f00', pts: 15, gd: 3, gf: 10, ga: 7, played: 10, wins: 4, draws: 3, losses: 3 },
  { id: 'c13', name: 'Last FC', primaryColor: '#00f', pts: 5, gd: -13, gf: 4, ga: 17, played: 10, wins: 1, draws: 2, losses: 7 },
];

const baseSnapshot: SeasonTransitionSnapshot = {
  currentLeague:    league8,
  currentSeason:    1,
  finalPosition:    1,
  promoted:         true,
  relegated:        false,
  weekNumber:       38,
  gamesPlayed:      10,
  wins:             6,
  draws:            2,
  losses:           2,
  goalsFor:         15,
  goalsAgainst:     5,
  points:           20,
  displayStandings: mockStandings,
};

// --- distributeSeasonFinances ---

describe('distributeSeasonFinances', () => {
  let addTransactionMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    addTransactionMock = jest.requireMock('@/stores/financeStore').useFinanceStore.getState().addTransaction as jest.Mock;
  });

  it('credits TV deal for next season', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const tvCall = addTransactionMock.mock.calls.find((c) => c[0].category === 'tv_deal');
    expect(tvCall).toBeDefined();
    expect(tvCall![0].description).toContain('Season 2');
    expect(tvCall![0].amount).toBe(5000); // 500000 pence = £5000
  });

  it('credits sponsor pot for next season', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const sponsorCall = addTransactionMock.mock.calls.find((c) => c[0].category === 'league_sponsor');
    expect(sponsorCall).toBeDefined();
  });

  it('credits prize money with correct season label', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const prizeCall = addTransactionMock.mock.calls.find((c) => c[0].description?.includes('prize money'));
    expect(prizeCall![0].description).toContain('Season 1');
  });

  it('calculates position prize correctly for Pos 1 (no decrease)', () => {
    // pos 1: multiplier = 1 - 0.08/100 * 0 = 1.0 → posPrize = 500000 pence = £5000
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const posCall = addTransactionMock.mock.calls.find((c) => c[0].description?.includes('position prize'));
    expect(posCall![0].amount).toBe(5000);
  });

  it('reduces position prize for lower positions', () => {
    // pos 2: multiplier = 1 - (8/100)*(2-1) = 0.92 → posPrize = Math.round(500000*0.92) = 460000 pence = £4600
    distributeSeasonFinances(undefined, league8, 2, 2, 38);
    const posCall = addTransactionMock.mock.calls.find((c) => c[0].description?.includes('position prize'));
    expect(posCall![0].amount).toBe(4600);
  });

  it('uses ampSeasonLeague financials when provided', () => {
    const newLeague: SeasonUpdateLeague = {
      ...twoLeagueResponse[0],
      tvDeal: 10000000,
    };
    distributeSeasonFinances(newLeague, league8, 2, 1, 38);
    const tvCall = addTransactionMock.mock.calls.find((c) => c[0].category === 'tv_deal');
    expect(tvCall![0].amount).toBe(100000); // 10000000 pence = £100000
  });
});

// --- recordSeasonHistory ---

describe('recordSeasonHistory', () => {
  let addSeasonRecordMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    addSeasonRecordMock = jest.requireMock('@/stores/leagueHistoryStore').useLeagueHistoryStore.getState().addSeasonRecord as jest.Mock;
  });

  it('calls addSeasonRecord with correct tier and season', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    expect(addSeasonRecordMock).toHaveBeenCalledTimes(1);
    const record = addSeasonRecordMock.mock.calls[0][0];
    expect(record.tier).toBe(8);
    expect(record.season).toBe(1);
    expect(record.leagueName).toBe('League 8');
    expect(record.weekCompleted).toBe(38);
  });

  it('records all clubs in standings with correct positions', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = addSeasonRecordMock.mock.calls[0][0];
    expect(record.standings).toHaveLength(3);
    expect(record.standings[0].position).toBe(1);
    expect(record.standings[2].position).toBe(3);
  });

  it('marks AMP club entry with isAmp=true', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = addSeasonRecordMock.mock.calls[0][0];
    expect(record.standings.find((s: { clubId: string }) => s.clubId === 'amp1')?.isAmp).toBe(true);
    expect(record.standings.find((s: { clubId: string }) => s.clubId === 'c12')?.isAmp).toBe(false);
  });

  it('sets relegated=true only for last-place club', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = addSeasonRecordMock.mock.calls[0][0];
    expect(record.standings[2].relegated).toBe(true);
    expect(record.standings[0].relegated).toBe(false);
  });

  it('maps gf/ga/gd fields to goalsFor/goalsAgainst/goalDifference correctly', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = addSeasonRecordMock.mock.calls[0][0];
    const ampEntry = record.standings.find((s: { clubId: string }) => s.clubId === 'amp1')!;
    expect(ampEntry.goalsFor).toBe(15);      // mockStandings[0].gf = 15
    expect(ampEntry.goalsAgainst).toBe(5);   // mockStandings[0].ga = 5
    expect(ampEntry.goalDifference).toBe(10); // mockStandings[0].gd = 10
  });
});

// --- performSeasonTransition ---

describe('performSeasonTransition', () => {
  let concludeSeasonMock: jest.Mock;
  let addSeasonRecordMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    concludeSeasonMock = jest.requireMock('@/api/endpoints/season').concludeSeason as jest.Mock;
    concludeSeasonMock.mockResolvedValue({ seasonRecordId: 'rec1', newLeague: null, leagues: twoLeagueResponse });
    addSeasonRecordMock = jest.requireMock('@/stores/leagueHistoryStore').useLeagueHistoryStore.getState().addSeasonRecord as jest.Mock;
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 38 } });
    const { useWorldStore } = jest.requireMock('@/stores/worldStore');
    useWorldStore.getState = () => ({
      clubs: {},
      leagues: mockWorldLeagues,
      applySeasonUpdate: mockApplySeasonUpdate,
    });
  });

  it('calls concludeSeason with the correct payload shape', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(concludeSeasonMock).toHaveBeenCalledTimes(1);
    const payload = concludeSeasonMock.mock.calls[0][0];
    expect(payload.finalPosition).toBe(1);
    expect(payload.promoted).toBe(true);
    expect(payload.pyramidSnapshot.leagues).toBeDefined();
  });

  it('calls applySeasonUpdate when response has leagues', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(mockApplySeasonUpdate).toHaveBeenCalledWith(twoLeagueResponse);
  });

  it('calls addSeasonRecord (history) after successful API call', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(addSeasonRecordMock).toHaveBeenCalledTimes(1);
  });

  it('calls addTransaction for financial distributions', async () => {
    await performSeasonTransition(baseSnapshot);
    const addTransactionMock = jest.requireMock('@/stores/financeStore').useFinanceStore.getState().addTransaction as jest.Mock;
    expect(addTransactionMock).toHaveBeenCalled();
  });

  it('propagates API errors to the caller', async () => {
    concludeSeasonMock.mockRejectedValue(new Error('Network error'));
    await expect(performSeasonTransition(baseSnapshot)).rejects.toThrow('Network error');
  });

  it('throws when server returns empty leagues array', async () => {
    concludeSeasonMock.mockResolvedValue({ seasonRecordId: 'r1', newLeague: null, leagues: [] });
    await expect(performSeasonTransition(baseSnapshot)).rejects.toThrow('empty leagues array');
  });
});
