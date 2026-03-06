import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlayerArchetype } from '@/types/archetype';
import { zustandStorage } from '@/utils/storage';
import { fetchArchetypeVersionHash, fetchArchetypes as apiFetchArchetypes } from '@/api/endpoints/archetypes';
import { DEFAULT_ARCHETYPES } from '@/constants/archetypes';

/** Re-fetch archetypes at most once per hour. */
const CACHE_TTL_MS = 60 * 60 * 1000;

interface ArchetypeState {
  archetypes: PlayerArchetype[];
  versionHash: string | null;
  isLoading: boolean;
  lastFetched: number | null;

  /** No-op — persist middleware handles rehydration. Kept for API compat. */
  loadFromCache: () => void;
  /**
   * Background refresh:
   * 1. If cache is fresh (< 1 hour old) and not forceRefresh, skip entirely.
   * 2. Otherwise, HEAD /api/archetypes — if version hash unchanged, skip full fetch.
   * 3. If hash changed or forceRefresh, fetch full list and update cache.
   */
  fetchArchetypes: (forceRefresh?: boolean) => Promise<void>;
  clearCache: () => void;
}

export const useArchetypeStore = create<ArchetypeState>()(
  persist(
    (set, get) => ({
      archetypes: DEFAULT_ARCHETYPES,
      versionHash: null,
      isLoading: false,
      lastFetched: null,

      loadFromCache: () => {
        // No-op: Zustand persist middleware rehydrates state from AsyncStorage
        // automatically on store creation.
      },

      fetchArchetypes: async (forceRefresh = false) => {
        const { lastFetched, versionHash, isLoading } = get();
        if (isLoading) return;

        // Skip if cache is fresh and not a forced refresh
        if (!forceRefresh && lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return;

        set({ isLoading: true });

        try {
          // HEAD check — skip full fetch if hash unchanged
          if (!forceRefresh && versionHash) {
            const serverHash = await fetchArchetypeVersionHash();
            if (serverHash && serverHash === versionHash) {
              set({ isLoading: false, lastFetched: Date.now() });
              return;
            }
          }

          // Full fetch
          const archetypes = await apiFetchArchetypes();
          if (!archetypes) return; // network error — keep existing cache

          // Derive a simple version hash from the data if server doesn't provide one
          const newHash = String(archetypes.length) + '_' + (archetypes[0]?.id ?? 0);

          set({ archetypes, versionHash: newHash, lastFetched: Date.now() });
        } catch (err) {
          console.warn('[archetypeStore] fetchArchetypes failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      clearCache: () => {
        set({ archetypes: [], versionHash: null, lastFetched: null });
      },
    }),
    {
      name: 'archetype-store',
      storage: zustandStorage,
      // If persisted cache is empty (e.g. first launch or cleared), keep defaults
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<ArchetypeState>;
        return {
          ...current,
          ...p,
          archetypes: (p?.archetypes && p.archetypes.length > 0) ? p.archetypes : DEFAULT_ARCHETYPES,
        };
      },
    },
  ),
);
