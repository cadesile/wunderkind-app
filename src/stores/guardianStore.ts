import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Guardian } from '@/types/guardian';

interface GuardianState {
  guardians: Guardian[];

  /** Add all guardians for a newly generated player */
  addGuardians: (newGuardians: Guardian[]) => void;

  /** Remove all guardians when a player leaves (transfer, withdrawal, age-out) */
  removeGuardiansForPlayer: (playerId: string) => void;

  /** Update a single guardian's mutable fields */
  updateGuardian: (guardianId: string, changes: Partial<Pick<Guardian,
    'demandLevel' | 'loyaltyToAcademy' | 'ignoredRequestCount'
  >>) => void;

  /** Returns all guardians for a given player */
  getGuardiansForPlayer: (playerId: string) => Guardian[];

  /**
   * Returns the single most-demanding guardian for a player.
   * Highest demandLevel wins; lowest loyaltyToAcademy breaks ties.
   */
  getWorstGuardian: (playerId: string) => Guardian | null;

  clearAll: () => void;
}

export const useGuardianStore = create<GuardianState>()(
  persist(
    (set, get) => ({
      guardians: [],

      addGuardians: (newGuardians) =>
        set((state) => ({ guardians: [...state.guardians, ...newGuardians] })),

      removeGuardiansForPlayer: (playerId) =>
        set((state) => ({
          guardians: state.guardians.filter((g) => g.playerId !== playerId),
        })),

      updateGuardian: (guardianId, changes) =>
        set((state) => ({
          guardians: state.guardians.map((g) =>
            g.id === guardianId ? { ...g, ...changes } : g
          ),
        })),

      getGuardiansForPlayer: (playerId) =>
        get().guardians.filter((g) => g.playerId === playerId),

      getWorstGuardian: (playerId) => {
        const playerGuardians = get().guardians.filter((g) => g.playerId === playerId);
        if (playerGuardians.length === 0) return null;
        return playerGuardians.reduce((worst, g) => {
          if (g.demandLevel > worst.demandLevel) return g;
          if (g.demandLevel === worst.demandLevel && g.loyaltyToAcademy < worst.loyaltyToAcademy) return g;
          return worst;
        });
      },

      clearAll: () => set({ guardians: [] }),
    }),
    {
      name: 'guardian-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
