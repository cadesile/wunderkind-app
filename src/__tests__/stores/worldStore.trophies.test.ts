import { useWorldStore } from '@/stores/worldStore';
import type { TrophyRecord } from '@/types/club';
import type { WorldClub } from '@/types/world';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
}));

const MOCK_CLUB: WorldClub = {
  id: 'club-1',
  name: 'FC Test',
  tier: 3,
  reputation: 50,
  primaryColor: '#ff0000',
  secondaryColor: '#ffffff',
  players: [],
  trophies: [],
} as unknown as WorldClub;

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

describe('worldStore.addTrophyToClub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorldStore.setState({
      clubs: { 'club-1': MOCK_CLUB },
      leagues: [{ id: 'league-1', name: 'Northern League', tier: 3, clubIds: ['club-1'] }],
    } as any);
  });

  it('appends trophy to the club in memory', async () => {
    await useWorldStore.getState().addTrophyToClub('club-1', MOCK_TROPHY);
    const club = useWorldStore.getState().clubs['club-1'];
    expect(club.trophies).toHaveLength(1);
    expect(club.trophies![0].leagueName).toBe('Northern League');
  });

  it('does nothing if club does not exist', async () => {
    await useWorldStore.getState().addTrophyToClub('nonexistent', MOCK_TROPHY);
    // Should not throw
  });

  it('persists to AsyncStorage', async () => {
    await useWorldStore.getState().addTrophyToClub('club-1', MOCK_TROPHY);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
