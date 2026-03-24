import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AltercationBlock } from '@/types/game';

interface AltercationState {
  pendingBlocks: AltercationBlock[];
  addBlock: (block: AltercationBlock) => void;
  resolveBlock: (playerAId: string, playerBId: string) => void;
  clearAll: () => void;
}

export const useAltercationStore = create<AltercationState>()(
  persist(
    (set) => ({
      pendingBlocks: [],

      addBlock: (block) =>
        set((state) => {
          // Avoid duplicate blocks for the same pair
          const already = state.pendingBlocks.some(
            (b) =>
              (b.playerAId === block.playerAId && b.playerBId === block.playerBId) ||
              (b.playerAId === block.playerBId && b.playerBId === block.playerAId),
          );
          if (already) return state;
          return { pendingBlocks: [...state.pendingBlocks, block] };
        }),

      resolveBlock: (playerAId, playerBId) =>
        set((state) => ({
          pendingBlocks: state.pendingBlocks.filter(
            (b) =>
              !(
                (b.playerAId === playerAId && b.playerBId === playerBId) ||
                (b.playerAId === playerBId && b.playerBId === playerAId)
              ),
          ),
        })),

      clearAll: () => set({ pendingBlocks: [] }),
    }),
    {
      name: 'altercation-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
