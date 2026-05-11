import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { GameConfig, DEFAULT_GAME_CONFIG } from '@/types/gameConfig';

/** Re-fetch the config every 4 game weeks (in-game ticks). */
const REFETCH_INTERVAL_WEEKS = 4;

interface GameConfigState {
  config: GameConfig;
  lastFetchedAt: string | null;
  /** Game week number at the time of the last successful fetch. */
  lastFetchedAtWeek: number | null;
  /**
   * Persist a freshly fetched config.
   * Always deep-merges with DEFAULT_GAME_CONFIG so no field can ever be empty
   * even if the server returns a partial payload.
   */
  setConfig: (config: GameConfig, weekNumber?: number) => void;
  /**
   * Returns true when a re-fetch should be triggered.
   * Pass the current game week to get a week-based check;
   * omit it for a simple "has data?" check (used on launch).
   */
  shouldRefetch: (currentWeek?: number) => boolean;
}

export const useGameConfigStore = create<GameConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_GAME_CONFIG,
      lastFetchedAt: null,
      lastFetchedAtWeek: null,

      setConfig: (config, weekNumber) =>
        set({
          // 3-way merge: defaults → current stored values → new server values.
          // This ensures a partial piggybacked config (e.g. from a sync response
          // that omits capacityCalculation) never silently resets a field that was
          // correctly set by the full /api/game-config fetch.
          config: { ...DEFAULT_GAME_CONFIG, ...get().config, ...config },
          lastFetchedAt: new Date().toISOString(),
          lastFetchedAtWeek: weekNumber ?? get().lastFetchedAtWeek ?? null,
        }),

      shouldRefetch: (currentWeek) => {
        const { lastFetchedAt, lastFetchedAtWeek } = get();
        // Never fetched — always fetch
        if (!lastFetchedAt) return true;
        if (currentWeek !== undefined) {
          // lastFetchedAtWeek is null when the startup fetch ran without a week
          // (i.e. the background refresh has never been seeded yet) — force one
          if (lastFetchedAtWeek === null) return true;
          return currentWeek - lastFetchedAtWeek >= REFETCH_INTERVAL_WEEKS;
        }
        // Has cached data and no week context → no re-fetch needed
        return false;
      },
    }),
    {
      name: 'game-config-store',
      storage: zustandStorage,
      // Deep-merge persisted config with DEFAULT_GAME_CONFIG so new fields
      // added to the default are always present even in old persisted sessions.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GameConfigState>),
        config: {
          ...DEFAULT_GAME_CONFIG,
          ...((persisted as Partial<GameConfigState>)?.config ?? {}),
        },
      }),
    },
  ),
);
