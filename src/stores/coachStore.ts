import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Coach } from '@/types/coach';
import { zustandStorage } from '@/utils/storage';

interface CoachState {
  coaches: Coach[];
  addCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      coaches: [],
      addCoach: (coach) =>
        set((state) => ({ coaches: [...state.coaches, coach] })),
      removeCoach: (id) =>
        set((state) => ({ coaches: state.coaches.filter((c) => c.id !== id) })),
    }),
    { name: 'coach-store', storage: zustandStorage }
  )
);
