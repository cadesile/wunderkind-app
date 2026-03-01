import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Academy, ReputationTier } from '@/types/academy';
import { zustandStorage } from '@/utils/storage';

function computeTier(reputation: number): ReputationTier {
  if (reputation >= 750) return 'Elite';
  if (reputation >= 400) return 'National';
  if (reputation >= 150) return 'Regional';
  return 'Local';
}

interface AcademyState {
  academy: Academy;
  setReputation: (delta: number) => void;
  addEarnings: (amount: number) => void;
  applyServerSync: (data: { reputation: number; totalCareerEarnings: number; hallOfFamePoints: number }) => void;
}

const DEFAULT_ACADEMY: Academy = {
  id: 'academy-1',
  name: 'Wunderkind Factory',
  foundedWeek: 1,
  reputation: 0,
  reputationTier: 'Local',
  totalCareerEarnings: 0,
  hallOfFamePoints: 0,
  squadSize: 0,
  staffCount: 1,
};

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set) => ({
      academy: DEFAULT_ACADEMY,
      setReputation: (delta) =>
        set((state) => {
          const next = Math.max(0, Math.min(1000, state.academy.reputation + delta));
          return {
            academy: {
              ...state.academy,
              reputation: next,
              reputationTier: computeTier(next),
            },
          };
        }),
      addEarnings: (amount) =>
        set((state) => ({
          academy: {
            ...state.academy,
            totalCareerEarnings: state.academy.totalCareerEarnings + amount,
          },
        })),
      applyServerSync: (data) =>
        set((state) => ({
          academy: {
            ...state.academy,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            totalCareerEarnings: data.totalCareerEarnings,
            hallOfFamePoints: data.hallOfFamePoints,
          },
        })),
    }),
    { name: 'academy-store', storage: zustandStorage }
  )
);
