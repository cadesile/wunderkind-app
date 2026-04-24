import { useEffect } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { eventsApi } from '@/api/endpoints/events';

/**
 * Fetches narrative event templates from the backend if the local cache
 * has expired (1-hour TTL). Safe to mount at the root layout — no-ops when
 * cache is warm or no auth token is available.
 */
export function useNarrativeSync(enabled = false): void {
  const { shouldRefetch, setTemplates } = useEventStore();

  useEffect(() => {
    if (!enabled || !shouldRefetch()) return;

    eventsApi.fetchTemplates()
      .then(setTemplates)
      .catch((err) => {
        // Templates are cached — a failed refresh is non-fatal
        console.warn('[useNarrativeSync] Failed to refresh event templates:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
