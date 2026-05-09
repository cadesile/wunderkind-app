import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Club, ClubPricing, ReputationTier, ManagerPersonality, ManagerProfile, SponsorContract, TrophyRecord } from '@/types/club';
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
  setId: (id: string) => void;
  setName: (name: string) => void;
  setReputation: (delta: number) => void;
  addEarnings: (amount: number) => void;
  addBalance: (amount: number) => void;
  /** Directly override balance (whole pounds). Use when syncing from API. */
  setBalance: (balance: number) => void;
  setCreatedAt: (date: string) => void;
  setSponsorIds: (ids: string[]) => void;
  /**
   * Register a newly accepted sponsorship contract.
   * Keeps sponsorIds in sync so legacy reads still work.
   */
  addSponsorContract: (contract: SponsorContract) => void;
  /**
   * Remove an expired or terminated sponsorship contract.
   * Keeps sponsorIds in sync.
   */
  removeSponsorContract: (id: string) => void;
  setInvestorId: (id: string | null, equityPct?: number | null, investmentAmount?: number | null) => void;
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
  setStadiumName: (name: string | null) => void;
  setFormation: (f: Club['formation']) => void;
  setPlayingStyle: (s: Club['playingStyle']) => void;
  setClubColors: (primary: string, secondary: string) => void;
  setBadgeShape: (shape: NonNullable<Club['badgeShape']>) => void;
  addTrophy: (record: TrophyRecord) => void;
  updatePricing: (pricing: Partial<ClubPricing>) => void;
}

export const DEFAULT_CLUB: Club = {
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
  sponsorContracts: [],
  investorId: null,
  investorEquityPct: null,
  investorInvestmentAmount: null,
  country: null,
  lastRepActivityWeek: 1,
  stadiumName: null,
  formation: '4-4-2',
  playingStyle: 'DIRECT',
  primaryColor: '#00897B',
  secondaryColor: '#FFC107',
  badgeShape: 'shield',
  trophies: [],
  pricing: {
    ticketPrice: 2500,
    shirtPrice: 4500,
    foodDrinksPrice: 800,
  },
};

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      club: DEFAULT_CLUB,
      managerPersonality: null,
      managerProfile: null,
      setId: (id) =>
        set((state) => ({ club: { ...state.club, id } })),
      setName: (name) =>
        set((state) => ({ club: { ...state.club, name } })),
      setReputation: (delta) =>
        set((state) => {
          const { useLeagueStore } = require('@/stores/leagueStore');
          const leagueCap: number | null = useLeagueStore.getState().league?.reputationCap ?? null;
          const ceiling = leagueCap !== null ? Math.min(100, leagueCap) : 100;
          const current = state.club.reputation;
          // When above the league cap (e.g., after relegation): suppress gains so the club
          // cannot grow further; allow losses to decay the reputation gradually toward the cap.
          const next = (current > ceiling && delta > 0)
            ? current
            : (current > ceiling && delta < 0)
              ? Math.max(0, Math.max(ceiling, current + delta))
              : Math.max(0, Math.min(ceiling, current + delta));
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
      addSponsorContract: (contract) =>
        set((state) => ({
          club: {
            ...state.club,
            sponsorContracts: [...(state.club.sponsorContracts ?? []), contract],
            sponsorIds: [...state.club.sponsorIds, contract.id],
          },
        })),
      removeSponsorContract: (id) =>
        set((state) => ({
          club: {
            ...state.club,
            sponsorContracts: (state.club.sponsorContracts ?? []).filter((c) => c.id !== id),
            sponsorIds: state.club.sponsorIds.filter((sid) => sid !== id),
          },
        })),
      setInvestorId: (id, equityPct, investmentAmount) =>
        set((state) => ({
          club: {
            ...state.club,
            investorId: id,
            investorEquityPct: id === null ? null : (equityPct ?? state.club.investorEquityPct),
            investorInvestmentAmount: id === null ? null : (investmentAmount ?? state.club.investorInvestmentAmount),
          },
        })),
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
        set((state) => {
          const { useLeagueStore } = require('@/stores/leagueStore');
          const leagueCap: number | null = useLeagueStore.getState().league?.reputationCap ?? null;
          const ceiling = leagueCap !== null ? Math.min(100, leagueCap) : 100;
          const reputation = Math.min(data.reputation, ceiling);
          return {
            club: {
              ...state.club,
              reputation,
              reputationTier: computeTier(reputation),
              // Take max — frontend accumulates earnings locally; backend may lag or return 0
              totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
              hallOfFamePoints: data.hallOfFamePoints,
            },
          };
        }),
      syncWithApi: (data) =>
        set((state) => {
          const { useLeagueStore } = require('@/stores/leagueStore');
          const leagueCap: number | null = useLeagueStore.getState().league?.reputationCap ?? null;
          const ceiling = leagueCap !== null ? Math.min(100, leagueCap) : 100;
          const reputation = Math.min(data.reputation, ceiling);
          return {
            club: {
              ...state.club,
              reputation,
              reputationTier: computeTier(reputation),
              weekNumber: data.weekNumber,
              totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
              hallOfFamePoints: data.hallOfFamePoints,
              // API returns balance in pence — store directly in pence
              balance: data.balance,
            },
          };
        }),
      updateFromSyncResponse: (data) =>
        set((state) => {
          const { useLeagueStore } = require('@/stores/leagueStore');
          const leagueCap: number | null = useLeagueStore.getState().league?.reputationCap ?? null;
          const ceiling = leagueCap !== null ? Math.min(100, leagueCap) : 100;
          const reputation = Math.min(data.reputation, ceiling);
          return {
            club: {
              ...state.club,
              id: data.id,
              reputation,
              reputationTier: computeTier(reputation),
              totalCareerEarnings: Math.max(state.club.totalCareerEarnings, data.totalCareerEarnings),
              hallOfFamePoints: data.hallOfFamePoints,
              // balance is optional — only update if the server returned it; stored in pence
              ...(data.balance !== undefined
                ? { balance: data.balance }
                : {}),
            },
          };
        }),
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
      setStadiumName: (name) =>
        set((state) => ({ club: { ...state.club, stadiumName: name } })),
      setFormation: (f) =>
        set((state) => ({ club: { ...state.club, formation: f } })),
      setPlayingStyle: (style) =>
        set((state) => ({ club: { ...state.club, playingStyle: style } })),
      setClubColors: (primary, secondary) =>
        set((state) => ({ club: { ...state.club, primaryColor: primary, secondaryColor: secondary } })),
      setBadgeShape: (shape) =>
        set((state) => ({ club: { ...state.club, badgeShape: shape } })),
      addTrophy: (record) =>
        set((s) => ({ club: { ...s.club, trophies: [...s.club.trophies, record] } })),
      updatePricing: (pricing) =>
        set((state) => ({
          club: {
            ...state.club,
            pricing: {
              ticketPrice: 2500,
              shirtPrice: 4500,
              foodDrinksPrice: 800,
              ...(state.club.pricing ?? {}),
              ...pricing,
            },
          },
        })),
    }),
    { name: 'club-store', storage: zustandStorage }
  )
);
