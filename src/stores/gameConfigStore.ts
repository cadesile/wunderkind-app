import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { GameConfig, DEFAULT_GAME_CONFIG } from '@/types/gameConfig';

const REFETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour — matches event template TTL

interface GameConfigState {
  config: GameConfig;
  lastFetchedAt: string | null;
  setConfig: (config: GameConfig) => void;
  shouldRefetch: () => boolean;
}

export const useGameConfigStore = create<GameConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_GAME_CONFIG,
      lastFetchedAt: null,

      setConfig: (config) =>
        set({ config, lastFetchedAt: new Date().toISOString() }),

      shouldRefetch: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - new Date(lastFetchedAt).getTime() > REFETCH_INTERVAL_MS;
      },
    }),
    { name: 'game-config-store', storage: zustandStorage },
  ),
);
