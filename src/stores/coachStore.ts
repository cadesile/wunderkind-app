import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Coach } from '@/types/coach';
import { zustandStorage } from '@/utils/storage';

interface CoachState {
  coaches: Coach[];
  addCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
  updateCoach: (id: string, changes: Partial<Coach>) => void;
  updateMorale: (coachId: string, delta: number) => void;
  setLowMoraleFlags: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      coaches: [],
      addCoach: (coach) =>
        set((state) => {
          if (state.coaches.some((c) => c.id === coach.id)) return state;
          return { coaches: [...state.coaches, coach] };
        }),
      removeCoach: (id) =>
        set((state) => ({ coaches: state.coaches.filter((c) => c.id !== id) })),
      updateCoach: (id, changes) =>
        set((state) => ({
          coaches: state.coaches.map((c) => c.id === id ? { ...c, ...changes } : c),
        })),

      updateMorale: (coachId, delta) =>
        set((state) => ({
          coaches: state.coaches.map((c) =>
            c.id === coachId
              ? { ...c, morale: Math.max(0, Math.min(100, (c.morale ?? 70) + delta)) }
              : c,
          ),
        })),

      setLowMoraleFlags: () =>
        set((state) => ({
          coaches: state.coaches.map((c) => ({
            ...c,
            isLowMorale: (c.morale ?? 70) < 40,
            effectiveInfluence: (c.morale ?? 70) < 40
              ? Math.max(1, Math.round(c.influence * 0.5))
              : c.influence,
          })),
        })),
    }),
    { name: 'coach-store', storage: zustandStorage }
  )
);
