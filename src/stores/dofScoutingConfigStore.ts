import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

export type ScoutPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type ScoutTargetType = 'FIRST_TEAM' | 'SQUAD_PLAYER' | 'NO_RESTRICTION';

export interface DofScoutingConfig {
  positions: ScoutPosition[];
  targetType: ScoutTargetType;
}

interface DofScoutingConfigState {
  config: DofScoutingConfig;
  setPositions: (positions: ScoutPosition[]) => void;
  setTargetType: (targetType: ScoutTargetType) => void;
  togglePosition: (position: ScoutPosition) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: DofScoutingConfig = {
  positions: ['GK', 'DEF', 'MID', 'FWD'],
  targetType: 'NO_RESTRICTION',
};

export const useDofScoutingConfigStore = create<DofScoutingConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,

      setPositions: (positions) =>
        set((state) => ({ config: { ...state.config, positions } })),

      setTargetType: (targetType) =>
        set((state) => ({ config: { ...state.config, targetType } })),

      togglePosition: (position) =>
        set((state) => {
          const current = state.config.positions;
          const next = current.includes(position)
            ? current.filter((p) => p !== position)
            : [...current, position];
          // Always keep at least one position selected
          if (next.length === 0) return state;
          return { config: { ...state.config, positions: next } };
        }),

      reset: () => set({ config: DEFAULT_CONFIG }),
    }),
    { name: 'dof-scouting-config', storage: zustandStorage },
  ),
);
