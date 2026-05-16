import { create } from 'zustand';
import { LeagueSnapshot } from '@/types/api';
import type { WorldLeague } from '@/types/world';
import type { FixtureResultEntry } from '@/db/types';
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
  generateFixturesFromWorldLeague: (league: WorldLeague, season: number, ampClubId?: string) => void;
  /**
   * Load pre-generated fixtures from a server fixture schedule.
   * schedule format: outer = matchday (0-indexed), inner = [homeClubId, awayClubId] pairs.
   * Safe to call on a league that already has fixtures for this season (no-op).
   */
  loadFromServerSchedule: (leagueId: string, season: number, schedule: [string, string][][]) => void;
  recordResult: (fixtureId: string, result: Omit<FixtureResult, 'synced'>) => void;
  /**
   * Bulk version of recordResult — updates all provided fixture results in a single set() call.
   */
  batchRecordResults: (entries: Array<{ fixtureId: string; result: Omit<FixtureResult, 'synced'> }>) => void;
  /**
   * Replace all in-memory fixtures. Used at boot (hydration from SQLite) and at season start.
   */
  setFixtures: (fixtures: Fixture[]) => void;
  /**
   * Update in-memory fixture results after simulation. Takes FixtureResultEntry[] from the
   * SQLite write path and applies them to the in-memory store in one set() call.
   */
  applyResultsToMemory: (entries: FixtureResultEntry[]) => void;
  advanceMatchday: () => void;
  setCurrentMatchday: (day: number) => void;
  markSynced: (fixtureIds: string[]) => void;
  clearSeason: () => void;
  getUnsyncedResults: () => Fixture[];
}

type FixtureStore = FixtureState & FixtureActions;

export const useFixtureStore = create<FixtureStore>()(
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

      generateFixturesFromWorldLeague: (league, season, ampClubId) => {
        const { fixtures } = get();
        const alreadyGenerated = fixtures.some(
          (f) => f.leagueId === league.id && f.season === season
        );
        if (alreadyGenerated) return;

        const participants = ampClubId
          ? [ampClubId, ...league.clubIds]
          : [...league.clubIds];
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

      loadFromServerSchedule: (leagueId, season, schedule) => {
        const { fixtures } = get();
        const alreadyLoaded = fixtures.some(
          (f) => f.leagueId === leagueId && f.season === season,
        );
        if (alreadyLoaded) return;

        const newFixtures: Fixture[] = [];
        schedule.forEach((matchday, roundIndex) => {
          matchday.forEach(([homeClubId, awayClubId]) => {
            newFixtures.push({
              id: `${leagueId}-s${season}-r${roundIndex + 1}-${homeClubId}-${awayClubId}`,
              leagueId,
              season,
              round: roundIndex + 1,
              homeClubId,
              awayClubId,
              result: null,
            });
          });
        });

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

      batchRecordResults: (entries) => {
        if (entries.length === 0) return;
        const resultMap = new Map(entries.map((e) => [e.fixtureId, e.result]));
        set((state) => ({
          fixtures: state.fixtures.map((f) => {
            const r = resultMap.get(f.id);
            return r ? { ...f, result: { ...r, synced: false } } : f;
          }),
        }));
      },

      setFixtures: (fixtures) => set({ fixtures }),

      applyResultsToMemory: (entries) => {
        set((state) => {
          const updated = [...state.fixtures];
          for (const e of entries) {
            const idx = updated.findIndex((f) => f.id === e.fixtureId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                result: {
                  homeGoals: e.homeGoals,
                  awayGoals: e.awayGoals,
                  playedAt: e.playedAt,
                  synced: false,
                },
              };
            }
          }
          return { fixtures: updated };
        });
      },

      advanceMatchday: () =>
        set((state) => ({ currentMatchday: state.currentMatchday + 1 })),

      setCurrentMatchday: (day) => set({ currentMatchday: day }),

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
    })
);
