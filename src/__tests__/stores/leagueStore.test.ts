import { LeagueSnapshot, ClubSnapshot } from '@/types/api';
import { useLeagueStore } from '@/stores/leagueStore';

beforeEach(() => {
  useLeagueStore.getState().clear();
});

function makeClub(id: string): ClubSnapshot {
  return {
    id,
    name: `Club ${id}`,
    reputation: 50,
    tier: 8,
    primaryColor: '#ff0000',
    secondaryColor: '#ffffff',
    stadiumName: null,
  };
}

function makeLeague(overrides: Partial<LeagueSnapshot> = {}): LeagueSnapshot {
  return {
    id: 'league-1',
    tier: 8,
    name: 'League 8',
    country: 'EN',
    season: 1,
    promotionSpots: null,
    reputationTier: null,
    tvDeal: null,
    sponsorPot: 0,
    prizeMoney: null,
    leaguePositionPot: null,
    leaguePositionDecreasePercent: 5,
    clubs: [makeClub('club-a'), makeClub('club-b')],
    ...overrides,
  };
}

describe('leagueStore', () => {
  it('initialises with null league and empty clubs', () => {
    const state = useLeagueStore.getState();
    expect(state.league).toBeNull();
    expect(state.clubs).toEqual([]);
  });

  it('setFromSync populates league and flattens clubs', () => {
    const league = makeLeague();

    useLeagueStore.getState().setFromSync(league);

    const state = useLeagueStore.getState();
    expect(state.league).toEqual(league);
    expect(state.clubs).toHaveLength(2);
    expect(state.clubs[0].id).toBe('club-a');
    expect(state.clubs[1].id).toBe('club-b');
  });

  it('setFromSync with null clears league and clubs', () => {
    useLeagueStore.getState().setFromSync(makeLeague());
    useLeagueStore.getState().setFromSync(null);

    const state = useLeagueStore.getState();
    expect(state.league).toBeNull();
    expect(state.clubs).toEqual([]);
  });

  it('clear resets league and clubs', () => {
    useLeagueStore.getState().setFromSync(makeLeague());
    useLeagueStore.getState().clear();

    const state = useLeagueStore.getState();
    expect(state.league).toBeNull();
    expect(state.clubs).toEqual([]);
  });

  it('setFromSync overwrites previous league data', () => {
    useLeagueStore.getState().setFromSync(makeLeague({ id: 'league-1', name: 'Old League' }));
    useLeagueStore.getState().setFromSync(makeLeague({ id: 'league-2', name: 'New League', clubs: [makeClub('club-x')] }));

    const state = useLeagueStore.getState();
    expect(state.league?.id).toBe('league-2');
    expect(state.clubs).toHaveLength(1);
    expect(state.clubs[0].id).toBe('club-x');
  });
});
