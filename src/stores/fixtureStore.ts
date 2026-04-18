import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LeagueSnapshot } from '@/types/api';
import type { WorldLeague } from '@/types/world';
import { zustandStorage } from '@/utils/storage';
import { generateRoundRobin } from '@/utils/fixtureGenerator';

export interface FixtureResult {
  homeGoals: number;
  awayGoals: number;
  playedAt: string;
  synced: boolean;
}

export interface Fixture {
  id: string;
  leagueId: string;
  season: number;
  round: number;
  homeClubId: string;
  awayClubId: string;
  result: FixtureResult | null;
}

interface FixtureState {
  fixtures: Fixture[];
  currentMatchday: number;
}

interface FixtureActions {
  generateFixtures: (league: LeagueSnapshot, ampClubId: string) => void;
  /** Generate fixtures from a WorldLeague (used at world init when no LeagueSnapshot exists yet). */
  generateFixturesFromWorldLeague: (league: WorldLeague, ampClubId: string, season: number) => void;
  recordResult: (fixtureId: string, result: Omit<FixtureResult, 'synced'>) => void;
  advanceMatchday: () => void;
  markSynced: (fixtureIds: string[]) => void;
  clearSeason: () => void;
  getUnsyncedResults: () => Fixture[];
}

type FixtureStore = FixtureState & FixtureActions;

export const useFixtureStore = create<FixtureStore>()(
  persist(
    (set, get) => ({
      fixtures: [],
      currentMatchday: 0,

      generateFixtures: (league, ampClubId) => {
        const { fixtures } = get();
        const alreadyGenerated = fixtures.some(
          (f) => f.leagueId === league.id && f.season === league.season
        );
        if (alreadyGenerated) return;

        const participants = [ampClubId, ...league.clubs.map((c) => c.id)];
        const generated = generateRoundRobin(participants);

        const newFixtures: Fixture[] = generated.map((g) => ({
          id: `${league.id}-s${league.season}-r${g.round}-${g.homeClubId}-${g.awayClubId}`,
          leagueId: league.id,
          season: league.season,
          round: g.round,
          homeClubId: g.homeClubId,
          awayClubId: g.awayClubId,
          result: null,
        }));

        set((state) => ({ fixtures: [...state.fixtures, ...newFixtures] }));
      },

      generateFixturesFromWorldLeague: (league, ampClubId, season) => {
        const { fixtures } = get();
        const alreadyGenerated = fixtures.some(
          (f) => f.leagueId === league.id && f.season === season
        );
        if (alreadyGenerated) return;

        const participants = [ampClubId, ...league.clubIds];
        const generated = generateRoundRobin(participants);

        const newFixtures: Fixture[] = generated.map((g) => ({
          id: `${league.id}-s${season}-r${g.round}-${g.homeClubId}-${g.awayClubId}`,
          leagueId: league.id,
          season,
          round: g.round,
          homeClubId: g.homeClubId,
          awayClubId: g.awayClubId,
          result: null,
        }));

        set((state) => ({
          fixtures: [...state.fixtures, ...newFixtures],
          currentMatchday: 1,
        }));
      },

      recordResult: (fixtureId, result) =>
        set((state) => ({
          fixtures: state.fixtures.map((f) =>
            f.id === fixtureId ? { ...f, result: { ...result, synced: false } } : f
          ),
        })),

      advanceMatchday: () =>
        set((state) => ({ currentMatchday: state.currentMatchday + 1 })),

      markSynced: (fixtureIds) => {
        const idSet = new Set(fixtureIds);
        set((state) => ({
          fixtures: state.fixtures.map((f) =>
            idSet.has(f.id) && f.result !== null
              ? { ...f, result: { ...f.result, synced: true } }
              : f
          ),
        }));
      },

      clearSeason: () => set({ fixtures: [], currentMatchday: 0 }),

      getUnsyncedResults: () =>
        get().fixtures.filter((f) => f.result !== null && f.result.synced === false),
    }),
    {
      name: 'fixture-store',
      storage: zustandStorage,
    }
  )
);
