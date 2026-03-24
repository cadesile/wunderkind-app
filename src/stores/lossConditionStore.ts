import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

export type LossConditionType = 'insolvency' | 'talent_drain';

interface AtRiskEntry {
  weeksAtRisk: number; // 1, 2, or 3 — at 3 they exit
}

interface LossConditionState {
  // Financial insolvency
  weeksNegativeBalance: number;

  // Talent drain — player count
  weeksUnderPlayerFloor: number; // <3 players; at 4 = game over

  // Talent drain — coach:player ratio (>5 players per coach)
  weeksUnderCoachRatio: number;

  // Talent drain — coaches leaving due to too few players (<=3 players)
  weeksCoachesWithFewPlayers: number;

  // Morale exit countdowns
  atRiskPlayers: Record<string, AtRiskEntry>;
  atRiskCoaches: Record<string, AtRiskEntry>;

  // Set at the moment of game over, read by the game over screen
  lossCondition: LossConditionType | null;

  // Set when the player taps "START AGAIN" on the game over screen;
  // watched by the root layout to trigger the reset + onboarding flow.
  pendingNewGame: boolean;

  // Actions
  setWeeksNegativeBalance: (n: number) => void;
  setWeeksUnderPlayerFloor: (n: number) => void;
  setWeeksUnderCoachRatio: (n: number) => void;
  setWeeksCoachesWithFewPlayers: (n: number) => void;
  setAtRiskPlayer: (id: string, entry: AtRiskEntry) => void;
  removeAtRiskPlayer: (id: string) => void;
  setAtRiskCoach: (id: string, entry: AtRiskEntry) => void;
  removeAtRiskCoach: (id: string) => void;
  triggerGameOver: (condition: LossConditionType) => void;
  requestNewGame: () => void;
  clearNewGameRequest: () => void;
  resetAll: () => void;
}

const INITIAL_STATE = {
  weeksNegativeBalance: 0,
  weeksUnderPlayerFloor: 0,
  weeksUnderCoachRatio: 0,
  weeksCoachesWithFewPlayers: 0,
  atRiskPlayers: {} as Record<string, AtRiskEntry>,
  atRiskCoaches: {} as Record<string, AtRiskEntry>,
  lossCondition: null as LossConditionType | null,
  pendingNewGame: false,
};

export const useLossConditionStore = create<LossConditionState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setWeeksNegativeBalance: (n) => set({ weeksNegativeBalance: n }),
      setWeeksUnderPlayerFloor: (n) => set({ weeksUnderPlayerFloor: n }),
      setWeeksUnderCoachRatio: (n) => set({ weeksUnderCoachRatio: n }),
      setWeeksCoachesWithFewPlayers: (n) => set({ weeksCoachesWithFewPlayers: n }),

      setAtRiskPlayer: (id, entry) =>
        set((state) => ({
          atRiskPlayers: { ...state.atRiskPlayers, [id]: entry },
        })),
      removeAtRiskPlayer: (id) =>
        set((state) => {
          const next = { ...state.atRiskPlayers };
          delete next[id];
          return { atRiskPlayers: next };
        }),

      setAtRiskCoach: (id, entry) =>
        set((state) => ({
          atRiskCoaches: { ...state.atRiskCoaches, [id]: entry },
        })),
      removeAtRiskCoach: (id) =>
        set((state) => {
          const next = { ...state.atRiskCoaches };
          delete next[id];
          return { atRiskCoaches: next };
        }),

      triggerGameOver: (condition) => set({ lossCondition: condition }),

      requestNewGame: () => set({ pendingNewGame: true }),
      clearNewGameRequest: () => set({ pendingNewGame: false }),

      resetAll: () => set({ ...INITIAL_STATE }),
    }),
    { name: 'loss-condition-store', storage: zustandStorage },
  ),
);
