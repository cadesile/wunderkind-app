import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MarketPlayer } from '@/types/market';
import { zustandStorage } from '@/utils/storage';
import { marketApi } from '@/api/endpoints/market';

/** 1-hour TTL — prospects change slowly vs. the 5-min market cache. */
const PROSPECT_TTL_MS = 60 * 60 * 1000;

interface ProspectPoolState {
  prospects: MarketPlayer[];
  /**
   * IDs permanently removed from the pool (discovered by a scout this session
   * or in a prior session). Prevents consumed prospects re-appearing on refresh.
   */
  consumedIds: string[];
  lastFetchedAt: string | null;
  isLoading: boolean;

  /** True if the cache has expired or has never been populated. */
  shouldRefetch: () => boolean;

  /**
   * Merge incoming backend prospects with the local pool.
   * Already-consumed IDs are filtered out; existing unconsumed prospects
   * are preserved so a refresh doesn't remove locally-held but unseen players.
   */
  setProspects: (incoming: MarketPlayer[]) => void;

  /**
   * Fetch from GET /api/market/data, respecting the 1-hour TTL.
   * Safe to call on every app resume — no-ops when cache is warm.
   * Silently ignores network errors so offline play is unaffected.
   */
  fetchProspects: () => Promise<void>;

  /**
   * Mark a prospect as discovered — removes from the pool and records its ID
   * in consumedIds to prevent it re-appearing after the next backend refresh.
   */
  consumeProspect: (id: string) => void;
}

export const useProspectPoolStore = create<ProspectPoolState>()(
  persist(
    (set, get) => ({
      prospects: [],
      consumedIds: [],
      lastFetchedAt: null,
      isLoading: false,

      shouldRefetch: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - new Date(lastFetchedAt).getTime() > PROSPECT_TTL_MS;
      },

      setProspects: (incoming) => {
        const { consumedIds, prospects } = get();
        const consumedSet = new Set(consumedIds);
        const existingIds = new Set(prospects.map((p) => p.id));

        // Add only new prospects not already present and not previously consumed
        const freshOnes = incoming.filter(
          (p) => !consumedSet.has(p.id) && !existingIds.has(p.id),
        );

        set((state) => ({
          prospects: [...state.prospects, ...freshOnes],
          lastFetchedAt: new Date().toISOString(),
        }));
      },

      fetchProspects: async () => {
        if (get().isLoading || !get().shouldRefetch()) return;

        set({ isLoading: true });
        try {
          const tier = (await import('@/stores/clubStore')).useClubStore.getState().club.reputationTier;
          const data = await marketApi.getMarketData(null, tier);
          get().setProspects(data.players);
        } catch {
          // Non-fatal — pool may already be seeded from a prior session.
          console.warn('[prospectPoolStore] Failed to refresh prospect pool — using cached data');
        } finally {
          set({ isLoading: false });
        }
      },

      consumeProspect: (id) =>
        set((state) => ({
          prospects: state.prospects.filter((p) => p.id !== id),
          consumedIds: [...state.consumedIds, id],
        })),
    }),
    {
      name: 'prospect-pool-store',
      storage: zustandStorage,
      partialize: (state) => ({
        prospects: state.prospects,
        consumedIds: state.consumedIds,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
