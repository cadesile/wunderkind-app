import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { uuidv7 } from '@/utils/uuidv7';
import { ChainLink } from '@/types/narrative';

export interface ActiveChainBoost {
  id: string;
  /** Canonical: `${lowerUUID}:${higherUUID}` */
  pairKey: string;
  /** Slug of the event that activated this boost */
  sourceSlug: string;
  /** Slug whose weight is boosted */
  boostedSlug: string;
  multiplier: number;
  expiresWeek: number;
}

function makePairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

interface EventChainState {
  boosts: ActiveChainBoost[];

  /**
   * Activates (or refreshes) a chain boost for a player pair.
   * If an entry already exists for the same pair + boostedSlug, its expiresWeek is updated.
   */
  activateChain: (
    sourceSlug: string,
    playerAId: string,
    playerBId: string,
    link: ChainLink,
    currentWeek: number,
  ) => void;

  /** Removes all entries where expiresWeek <= currentWeek. Call at the top of each tick. */
  expireChains: (currentWeek: number) => void;

  /** Returns all active boosts for the given player pair. */
  getBoostsForPair: (playerAId: string, playerBId: string) => ActiveChainBoost[];

  clearAll: () => void;
}

export const useEventChainStore = create<EventChainState>()(
  persist(
    (set, get) => ({
      boosts: [],

      activateChain: (sourceSlug, playerAId, playerBId, link, currentWeek) => {
        const pairKey = makePairKey(playerAId, playerBId);
        const expiresWeek = currentWeek + link.windowWeeks;

        set((state) => {
          const existingIndex = state.boosts.findIndex(
            (b) => b.pairKey === pairKey && b.boostedSlug === link.nextEventSlug,
          );

          if (existingIndex !== -1) {
            // Refresh the expiry window
            const updated = [...state.boosts];
            updated[existingIndex] = {
              ...updated[existingIndex],
              sourceSlug,
              multiplier: link.boostMultiplier,
              expiresWeek,
            };
            return { boosts: updated };
          }

          return {
            boosts: [
              ...state.boosts,
              {
                id: uuidv7(),
                pairKey,
                sourceSlug,
                boostedSlug: link.nextEventSlug,
                multiplier: link.boostMultiplier,
                expiresWeek,
              },
            ],
          };
        });
      },

      expireChains: (currentWeek) =>
        set((state) => ({
          boosts: state.boosts.filter((b) => b.expiresWeek > currentWeek),
        })),

      getBoostsForPair: (playerAId, playerBId) => {
        const pairKey = makePairKey(playerAId, playerBId);
        return get().boosts.filter((b) => b.pairKey === pairKey);
      },

      clearAll: () => set({ boosts: [] }),
    }),
    { name: 'event-chain-store', storage: zustandStorage },
  ),
);
