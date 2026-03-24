import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Academy, ReputationTier, ManagerPersonality, ManagerProfile } from '@/types/academy';
import { zustandStorage } from '@/utils/storage';
import type { AcademyStatusResponse, SyncAcceptedResponse } from '@/types/api';

function computeTier(reputation: number): ReputationTier {
  if (reputation >= 75) return 'Elite';
  if (reputation >= 40) return 'National';
  if (reputation >= 15) return 'Regional';
  return 'Local';
}

interface AcademyState {
  academy: Academy;
  managerPersonality: ManagerPersonality | null;
  setName: (name: string) => void;
  setReputation: (delta: number) => void;
  addEarnings: (amount: number) => void;
  addBalance: (amount: number) => void;
  /** Directly override balance (whole pounds). Use when syncing from API. */
  setBalance: (balance: number) => void;
  setCreatedAt: (date: string) => void;
  setSponsorIds: (ids: string[]) => void;
  setInvestorId: (id: string | null) => void;
  setCountry: (country: Academy['country']) => void;
  incrementWeek: () => void;
  /** 409 conflict resolution: hard-reset weekNumber to the server's authoritative value */
  rollbackWeek: (weekNumber: number) => void;
  applyServerSync: (data: { reputation: number; totalCareerEarnings: number; hallOfFamePoints: number }) => void;
  /**
   * Sync all academy fields from a GET /api/academy/status response.
   * Balance is converted from pence to whole pounds.
   */
  syncWithApi: (data: AcademyStatusResponse) => void;
  /**
   * Apply balance from a sync response alongside the existing aggregates.
   * Balance is optional (older backend versions omit it).
   */
  updateFromSyncResponse: (data: SyncAcceptedResponse['academy']) => void;
  managerProfile: ManagerProfile | null;
  setManagerProfile: (profile: ManagerProfile) => void;
  setManagerPersonality: (personality: ManagerPersonality) => void;
  updateManagerPersonality: (shifts: Partial<Pick<ManagerPersonality, 'temperament' | 'discipline' | 'ambition'>>) => void;
  /** Record that a rep-positive event occurred this week (signing, upgrade, breakthrough, transfer). */
  markRepActivity: () => void;
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
  country: null,
  lastRepActivityWeek: 1,
};

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set) => ({
      academy: DEFAULT_ACADEMY,
      managerPersonality: null,
      managerProfile: null,
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
      setBalance: (balance) =>
        set((state) => ({ academy: { ...state.academy, balance } })),
      setCreatedAt: (date) =>
        set((state) => ({ academy: { ...state.academy, createdAt: date } })),
      setSponsorIds: (ids) =>
        set((state) => ({ academy: { ...state.academy, sponsorIds: ids } })),
      setInvestorId: (id) =>
        set((state) => ({ academy: { ...state.academy, investorId: id } })),
      setCountry: (country) =>
        set((state) => ({ academy: { ...state.academy, country } })),
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
            // Take max — frontend accumulates earnings locally; backend may lag or return 0
            totalCareerEarnings: Math.max(state.academy.totalCareerEarnings, data.totalCareerEarnings),
            hallOfFamePoints: data.hallOfFamePoints,
          },
        })),
      syncWithApi: (data) =>
        set((state) => ({
          academy: {
            ...state.academy,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            weekNumber: data.weekNumber,
            totalCareerEarnings: Math.max(state.academy.totalCareerEarnings, data.totalCareerEarnings),
            hallOfFamePoints: data.hallOfFamePoints,
            // API returns balance in pence — store directly in pence
            balance: data.balance,
          },
        })),
      updateFromSyncResponse: (data) =>
        set((state) => ({
          academy: {
            ...state.academy,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            totalCareerEarnings: Math.max(state.academy.totalCareerEarnings, data.totalCareerEarnings),
            hallOfFamePoints: data.hallOfFamePoints,
            // balance is optional — only update if the server returned it; stored in pence
            ...(data.balance !== undefined
              ? { balance: data.balance }
              : {}),
          },
        })),
      setManagerProfile: (profile) =>
        set({ managerProfile: profile }),

      setManagerPersonality: (personality) =>
        set({ managerPersonality: personality }),

      updateManagerPersonality: (shifts) =>
        set((state) => {
          if (!state.managerPersonality) return state;
          const clamp = (v: number) => Math.max(0, Math.min(100, v));
          return {
            managerPersonality: {
              ...state.managerPersonality,
              temperament: shifts.temperament !== undefined
                ? clamp(state.managerPersonality.temperament + shifts.temperament)
                : state.managerPersonality.temperament,
              discipline: shifts.discipline !== undefined
                ? clamp(state.managerPersonality.discipline + shifts.discipline)
                : state.managerPersonality.discipline,
              ambition: shifts.ambition !== undefined
                ? clamp(state.managerPersonality.ambition + shifts.ambition)
                : state.managerPersonality.ambition,
            },
          };
        }),
      markRepActivity: () =>
        set((state) => ({
          academy: {
            ...state.academy,
            lastRepActivityWeek: state.academy.weekNumber,
          },
        })),
    }),
    { name: 'academy-store', storage: zustandStorage }
  )
);
