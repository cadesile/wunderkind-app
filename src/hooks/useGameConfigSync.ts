import { useGameConfigStore } from '@/stores/gameConfigStore';
import { fetchGameConfig } from '@/api/endpoints/gameConfig';

/**
 * Fetches the latest GameConfig from the server and caches it in the store.
 *
 * Pass `weekNumber` when calling from within the game loop so the store
 * can track which game week the config was last synced at.
 *
 * Returns `true` if a config is available (freshly fetched or previously
 * cached), `false` only on first launch with no network and no cache.
 */
export async function fetchAndCacheGameConfig(weekNumber?: number): Promise<boolean> {
  const store = useGameConfigStore.getState();
  try {
    const config = await fetchGameConfig();
    store.setConfig(config, weekNumber);
    return true;
  } catch (err) {
    console.warn('[fetchAndCacheGameConfig] Failed to fetch game config:', err);
    // Keep whatever is cached — values must never be emptied
    return store.lastFetchedAt !== null;
  }
}
