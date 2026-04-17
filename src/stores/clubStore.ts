import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Club, ReputationTier, ManagerPersonality, ManagerProfile } from '@/types/club';
import { zustandStorage } from '@/utils/storage';
import type { ClubStatusResponse, SyncAcceptedResponse } from '@/types/api';

function computeTier(reputation: number): ReputationTier {
  if (reputation >= 75) return 'Elite';
  if (reputation >= 40) return 'National';
  if (reputation >= 15) return 'Regional';
  return 'Local';
}

interface ClubState {
  club: Club;
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
  setCountry: (country: Club['country']) => void;
  incrementWeek: () => void;
  /** 409 conflict resolution: hard-reset weekNumber to the server's authoritative value */
  rollbackWeek: (weekNumber: number) => void;
  applyServerSync: (data: { reputation: number; totalCareerEarnings: number; hallOfFamePoints: number }) => void;
  /**
   * Sync all club fields from a GET /api/club/status response.
   * Balance is converted from pence to whole pounds.
   */
  syncWithApi: (data: ClubStatusResponse) => void;
  /**
   * Apply balance from a sync response alongside the existing aggregates.
   * Balance is optional (older backend versions omit it).
   */
  updateFromSyncResponse: (data: SyncAcceptedResponse['club']) => void;
  managerProfile: ManagerProfile | null;
  setManagerProfile: (profile: ManagerProfile) => void;
  setManagerPersonality: (personality: ManagerPersonality) => void;
  updateManagerPersonality: (shifts: Partial<Pick<ManagerPersonality, 'temperament' | 'discipline' | 'ambition'>>) => void;
  /** Record that a rep-positive event occurred this week (signing, upgrade, breakthrough, transfer). */
  markRepActivity: () => void;
}

const DEFAULT_ACADEMY: Club = {
  id: 'club-1',
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

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      club: DEFAULT_ACADEMY,
      managerPersonality: null,
      managerProfile: null,
      setName: (name) =>
        set((state) => ({ club: { ...state.club, name } })),
      setReputation: (delta) =>
        set((state) => {
          const next = Math.max(0, Math.min(100, state.club.reputation + delta));
          return {
            club: {
              ...state.club,
              reputation: next,
              reputationTier: computeTier(next),
            },
          };
        }),
      addEarnings: (amount) =>
        set((state) => ({
          club: {
            ...state.club,
            totalCareerEarnings: state.club.totalCareerEarnings + amount,
          },
        })),
      addBalance: (amount) =>
        set((state) => ({
          club: {
            ...state.club,
            balance: (state.club.balance ?? 0) + amount,
          },
        })),
      setBalance: (balance) =>
        set((state) => ({ club: { ...state.club, balance } })),
      setCreatedAt: (date) =>
        set((state) => ({ club: { ...state.club, createdAt: date } })),
      setSponsorIds: (ids) =>
        set((state) => ({ club: { ...state.club, sponsorIds: ids } })),
      setInvestorId: (id) =>
        set((state) => ({ club: { ...state.club, investorId: id } })),
      setCountry: (country) =>
        set((state) => ({ club: { ...state.club, country } })),
      incrementWeek: () =>
        set((state) => ({
          club: {
            ...state.club,
            weekNumber: (state.club.weekNumber ?? 1) + 1,
          },
        })),
      rollbackWeek: (weekNumber) =>
        set((state) => ({
          club: { ...state.club, weekNumber },
        })),
      applyServerSync: (data) =>
        set((state) => ({
          club: {
            ...state.club,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            // Take max — frontend accumulates earnings locally; backend may lag or return 0
            totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
            hallOfFamePoints: data.hallOfFamePoints,
          },
        })),
      syncWithApi: (data) =>
        set((state) => ({
          club: {
            ...state.club,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            weekNumber: data.weekNumber,
            totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
            hallOfFamePoints: data.hallOfFamePoints,
            // API returns balance in pence — store directly in pence
            balance: data.balance,
          },
        })),
      updateFromSyncResponse: (data) =>
        set((state) => ({
          club: {
            ...state.club,
            id: data.id,
            reputation: data.reputation,
            reputationTier: computeTier(data.reputation),
            totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
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
          club: {
            ...state.club,
            lastRepActivityWeek: state.club.weekNumber,
          },
        })),
    }),
    { name: 'club-store', storage: zustandStorage }
  )
);
