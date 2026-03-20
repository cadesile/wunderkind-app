import { useEffect } from 'react';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { fetchGameConfig } from '@/api/endpoints/gameConfig';

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
