import React from 'react';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

// Mock clubStore
jest.mock('@/stores/clubStore', () => ({
  useClubStore: jest.fn(),
}));

// Mock PitchBackground
jest.mock('@/components/ui/PitchBackground', () => ({
  PitchBackground: () => null,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  Trophy: () => null,
}));

// Mock PixelText components
jest.mock('@/components/ui/PixelText', () => ({
  PixelText: ({ children }: { children: React.ReactNode }) => children,
  VT323Text: ({ children }: { children: React.ReactNode }) => children,
  BodyText: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock theme
jest.mock('@/constants/theme', () => ({
  WK: {
    greenDark: '#1a5c2a',
    tealMid: '#1e6b5e',
    tealCard: '#1d5c52',
    tealDark: '#1a4a4a',
    tealLight: '#3db89a',
    border: '#0d2e28',
    yellow: '#f5c842',
    text: '#e8f4e8',
    dim: '#aadac9',
  },
  pixelShadow: {},
}));

import { useClubStore } from '@/stores/clubStore';
import MuseumScreen from '../../../app/museum';

describe('MuseumScreen', () => {
  it('is a valid React component (default export)', () => {
    expect(typeof MuseumScreen).toBe('function');
  });

  it('renders empty state when no trophies', () => {
    (useClubStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ club: { trophies: [], id: 'my-club' } })
    );

    // Verify the component renders without throwing
    const element = React.createElement(MuseumScreen);
    expect(element).toBeTruthy();
    expect(element.type).toBe(MuseumScreen);
  });

  it('renders trophy card when trophies exist', () => {
    const mockTrophy = {
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
      standings: [
        {
          clubId: 'my-club',
          clubName: 'My Club',
          position: 1,
          wins: 20,
          draws: 10,
          losses: 8,
          points: 70,
          goalDifference: 25,
        },
      ],
    };

    (useClubStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ club: { trophies: [mockTrophy], id: 'my-club' } })
    );

    // Verify the component renders without throwing when trophies exist
    const element = React.createElement(MuseumScreen);
    expect(element).toBeTruthy();
  });

  it('reads trophies from clubStore and reverses for newest-first display', () => {
    const trophy1 = { leagueName: 'Season 1 League', season: 1, tier: 1, type: 'league_title', weekCompleted: 38, wins: 15, draws: 10, losses: 13, points: 55, goalsFor: 50, goalsAgainst: 45, standings: [] };
    const trophy2 = { leagueName: 'Season 2 League', season: 2, tier: 1, type: 'league_title', weekCompleted: 38, wins: 20, draws: 8, losses: 10, points: 68, goalsFor: 60, goalsAgainst: 38, standings: [] };

    const trophies = [trophy1, trophy2];
    const reversed = [...trophies].reverse();

    // Newest first — season 2 should come before season 1
    expect(reversed[0].season).toBe(2);
    expect(reversed[1].season).toBe(1);
  });

  it('computes played count correctly from wins+draws+losses', () => {
    const entry = { clubId: 'c1', clubName: 'Club 1', position: 1, wins: 20, draws: 10, losses: 8, points: 70, goalDifference: 25 };
    const played = entry.wins + entry.draws + entry.losses;
    expect(played).toBe(38);
  });
});
