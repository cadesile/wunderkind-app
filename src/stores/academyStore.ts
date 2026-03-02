import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Academy, ReputationTier } from '@/types/academy';
import { zustandStorage } from '@/utils/storage';

function computeTier(reputation: number): ReputationTier {
  if (reputation >= 75) return 'Elite';
  if (reputation >= 40) return 'National';
  if (reputation >= 15) return 'Regional';
  return 'Local';
}

interface AcademyState {
  academy: Academy;
  setName: (name: string) => void;
  setReputation: (delta: number) => void;
  addEarnings: (amount: number) => void;
  addBalance: (amount: number) => void;
  setCreatedAt: (date: string) => void;
  setSponsorIds: (ids: string[]) => void;
  setInvestorId: (id: string | null) => void;
  incrementWeek: () => void;
  /** 409 conflict resolution: hard-reset weekNumber to the server's authoritative value */
  rollbackWeek: (weekNumber: number) => void;
  applyServerSync: (data: { reputation: number; totalCareerEarnings: number; hallOfFamePoints: number }) => void;
}

const DEFAULT_ACADEMY: Academy = {
  id: 'academy-1',
  name: 'Wunderkind Factory',
  foundedWeek: 1,
  weekNumber: 1,
  reputation: 0,
  reputationTier: 'Local',
  totalCareerEarnings: 0,
  hallOfFamePoints: 0,
  squadSize: 0,
  staffCount: 1,
  balance: 0,
  createdAt: '',
  sponsorIds: [],
  investorId: null,
};

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set) => ({
      academy: DEFAULT_ACADEMY,
      setName: (name) =>
        set((state) => ({ academy: { ...state.academy, name } })),
      setReputation: (delta) =>
        set((state) => {
          const next = Math.max(0, Math.min(100, state.academy.reputation + delta));
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
      addBalance: (amount) =>
        set((state) => ({
          academy: {
            ...state.academy,
            balance: (state.academy.balance ?? 0) + amount,
          },
        })),
      setCreatedAt: (date) =>
        set((state) => ({ academy: { ...state.academy, createdAt: date } })),
      setSponsorIds: (ids) =>
        set((state) => ({ academy: { ...state.academy, sponsorIds: ids } })),
      setInvestorId: (id) =>
        set((state) => ({ academy: { ...state.academy, investorId: id } })),
      incrementWeek: () =>
        set((state) => ({
          academy: {
            ...state.academy,
            weekNumber: (state.academy.weekNumber ?? 1) + 1,
          },
        })),
      rollbackWeek: (weekNumber) =>
        set((state) => ({
          academy: { ...state.academy, weekNumber },
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
