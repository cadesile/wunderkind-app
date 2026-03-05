import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import { ActiveEffect } from '@/types/narrative';

interface ActiveEffectState {
  effects: ActiveEffect[];

  addEffect: (effect: ActiveEffect) => void;
  removeEffect: (id: string) => void;
  /**
   * Decrement all tick counters by 1.
   * Returns the effects that hit zero (completed) — caller is responsible for
   * triggering completion events.
   */
  decrementAllTicks: () => ActiveEffect[];
  getEffectsForEntity: (entityId: string) => ActiveEffect[];
  clearAll: () => void;
}

export const useActiveEffectStore = create<ActiveEffectState>()(
  persist(
    (set, get) => ({
      effects: [],

      addEffect: (effect) =>
        set((state) => ({ effects: [...state.effects, effect] })),

      removeEffect: (id) =>
        set((state) => ({ effects: state.effects.filter((e) => e.id !== id) })),

      decrementAllTicks: () => {
        const completed: ActiveEffect[] = [];
        set((state) => {
          const next = state.effects
            .map((e) => ({ ...e, ticksRemaining: e.ticksRemaining - 1 }))
            .filter((e) => {
              if (e.ticksRemaining <= 0) {
                completed.push(e);
                return false;
              }
              return true;
            });
          return { effects: next };
        });
        return completed;
      },

      getEffectsForEntity: (entityId) =>
        get().effects.filter((e) => e.affectedEntityId === entityId),

      clearAll: () => set({ effects: [] }),
    }),
    { name: 'active-effect-store', storage: zustandStorage },
  ),
);
