import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Coach } from '@/types/coach';
import { zustandStorage } from '@/utils/storage';

interface CoachState {
  coaches: Coach[];
  addCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
  updateCoach: (id: string, changes: Partial<Coach>) => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      coaches: [],
      addCoach: (coach) =>
        set((state) => ({ coaches: [...state.coaches, coach] })),
      removeCoach: (id) =>
        set((state) => ({ coaches: state.coaches.filter((c) => c.id !== id) })),
      updateCoach: (id, changes) =>
        set((state) => ({
          coaches: state.coaches.map((c) => c.id === id ? { ...c, ...changes } : c),
        })),
    }),
    { name: 'coach-store', storage: zustandStorage }
  )
);
