import { useClubStore } from '@/stores/clubStore';
import type { TrophyRecord } from '@/types/club';

const MOCK_TROPHY: TrophyRecord = {
  type: 'league_title',
  tier: 3,
  leagueName: 'Northern League',
  season: 1,
  weekCompleted: 38,
  wins: 20,
  draws: 10,
  losses: 8,
  points: 70,
  goalsFor: 65,
  goalsAgainst: 40,
  standings: [],
};

describe('clubStore.addTrophy', () => {
  beforeEach(() => {
    // Reset to DEFAULT_CLUB state
    useClubStore.setState((s) => ({ club: { ...s.club, trophies: [] } }));
  });

  it('starts with empty trophies', () => {
    expect(useClubStore.getState().club.trophies).toEqual([]);
  });

  it('appends a trophy record', () => {
    useClubStore.getState().addTrophy(MOCK_TROPHY);
    const trophies = useClubStore.getState().club.trophies;
    expect(trophies).toHaveLength(1);
    expect(trophies[0].leagueName).toBe('Northern League');
  });

  it('appends multiple trophies', () => {
    useClubStore.getState().addTrophy(MOCK_TROPHY);
    useClubStore.getState().addTrophy({ ...MOCK_TROPHY, season: 2 });
    const trophies = useClubStore.getState().club.trophies;
    expect(trophies).toHaveLength(2);
    expect(trophies[1].season).toBe(2);
  });
});
