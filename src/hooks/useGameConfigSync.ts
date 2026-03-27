import { useEffect } from 'react';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { fetchGameConfig } from '@/api/endpoints/gameConfig';

/**
 * Fetches the latest GameConfig from the server and caches it in the store.
 *
 * Returns `true` if the config is available (either freshly fetched or
 * previously cached), `false` if this is a first launch with no network.
 */
export async function fetchAndCacheGameConfig(): Promise<boolean> {
  const store = useGameConfigStore.getState();
  try {
    const config = await fetchGameConfig();
    store.setConfig(config);
    return true;
  } catch (err) {
    console.warn('[fetchAndCacheGameConfig] Failed to fetch game config:', err);
    // Return true if we have a previously cached config (returning player offline)
    return store.lastFetchedAt !== null;
  }
}

export function useGameConfigSync(): void {
  const { shouldRefetch, setConfig } = useGameConfigStore();

  useEffect(() => {
    if (!shouldRefetch()) return;

    fetchGameConfig()
      .then(setConfig)
      .catch((err) => {
        console.warn('[useGameConfigSync] Failed to refresh game config:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
