import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Scout } from '@/types/market';
import { zustandStorage } from '@/utils/storage';

interface ScoutState {
  scouts: Scout[];
  addScout: (scout: Scout) => void;
  removeScout: (id: string) => void;
  updateScout: (id: string, changes: Partial<Scout>) => void;
}

export const useScoutStore = create<ScoutState>()(
  persist(
    (set) => ({
      scouts: [],
      addScout: (scout) =>
        set((state) => ({ scouts: [...state.scouts, scout] })),
      removeScout: (id) =>
        set((state) => ({ scouts: state.scouts.filter((s) => s.id !== id) })),
      updateScout: (id, changes) =>
        set((state) => ({
          scouts: state.scouts.map((s) => s.id === id ? { ...s, ...changes } : s),
        })),
    }),
    { name: 'scout-store', storage: zustandStorage }
  )
);
