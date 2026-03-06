import { useEffect } from 'react';
import { useArchetypeStore } from '@/stores/archetypeStore';

/**
 * Syncs archetypes on app launch.
 * - Persist middleware already rehydrates cache from AsyncStorage on store creation.
 * - Background fetch checks for a new version (non-blocking).
 *
 * Call this in the root layout (_layout.tsx).
 */
export function useArchetypeSync(): void {
  const { loadFromCache, fetchArchetypes } = useArchetypeStore();

  useEffect(() => {
    loadFromCache(); // no-op; persist handles rehydration

    fetchArchetypes(false).catch((err) => {
      console.warn('[useArchetypeSync] Archetype sync failed:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
