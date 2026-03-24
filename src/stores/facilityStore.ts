import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FacilityLevels,
  FacilityConditions,
  FacilityType,
  FACILITY_DEFS,
  weeklyDecayRate,
  repairFacilityCost,
} from '@/types/facility';
import { zustandStorage } from '@/utils/storage';
import { calculateFacilityUpkeep, calculateTotalUpkeep } from '@/utils/facilityUpkeep';

export { calculateFacilityUpkeep };

const MAX_LEVEL = 10;

const ALL_TYPES: FacilityType[] = [
  'technicalZone', 'strengthSuite', 'tacticalRoom',
  'physioClinic', 'hydroPool', 'scoutingCenter',
];

const DEFAULT_LEVELS: FacilityLevels = {
  technicalZone:  0,
  strengthSuite:  0,
  tacticalRoom:   0,
  physioClinic:   0,
  hydroPool:      0,
  scoutingCenter: 0,
};

const DEFAULT_CONDITIONS: FacilityConditions = {
  technicalZone:  100,
  strengthSuite:  100,
  tacticalRoom:   100,
  physioClinic:   100,
  hydroPool:      100,
  scoutingCenter: 100,
};

/** Upgrade cost from current level → next level: nextLevel × baseCost (whole pounds) */
export function facilityUpgradeCost(type: FacilityType, currentLevel: number): number {
  const def = FACILITY_DEFS.find((d) => d.type === type);
  if (!def || currentLevel >= MAX_LEVEL) return Infinity;
  return (currentLevel + 1) * def.baseCost;
}

interface FacilityState {
  levels: FacilityLevels;
  conditions: FacilityConditions;
  upgradeLevel: (type: FacilityType) => boolean;
  /** Sets technicalZone to level 1; all others start at 0. Called once during bootstrap. */
  initAllLevels: () => void;
  /** Decays all built facilities by their weekly rate. Called at end of each game tick. */
  decayCondition: () => void;
  /** Restores facility condition to 100%. Deducts cost from academy balance. */
  repairFacility: (type: FacilityType) => void;
  /** Squad capacity: base 15, or 10 + physioClinic.level × 3 if built */
  maxSquadSize: () => number;
  /** Scouting/trait visibility unlocked once scoutingCenter ≥ 1 */
  analyticsUnlocked: () => boolean;
  /** Total weekly maintenance cost across all facilities (pence) */
  totalWeeklyMaintenance: () => number;
}

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set, get) => ({
      levels: DEFAULT_LEVELS,
      conditions: DEFAULT_CONDITIONS,

      upgradeLevel: (type) => {
        const current = get().levels[type];
        if (current >= MAX_LEVEL) return false;
        set((state) => ({
          levels: { ...state.levels, [type]: state.levels[type] + 1 },
        }));
        // Award reputation for the upgrade — more for externally visible facilities
        const def = FACILITY_DEFS.find((d) => d.type === type);
        if (def) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useAcademyStore } = require('@/stores/academyStore');
          const { setReputation, markRepActivity } = useAcademyStore.getState();
          setReputation(def.reputationBonus);
          markRepActivity();
        }
        return true;
      },

      initAllLevels: () =>
        set({
          levels: { ...DEFAULT_LEVELS, technicalZone: 1 },
          conditions: DEFAULT_CONDITIONS,
        }),

      decayCondition: () =>
        set((state) => {
          const next = { ...state.conditions };
          ALL_TYPES.forEach((type) => {
            const lvl = state.levels[type];
            if (lvl === 0) return;
            next[type] = Math.max(0, next[type] - weeklyDecayRate(lvl));
          });
          return { conditions: next };
        }),

      repairFacility: (type) => {
        const { levels, conditions } = get();
        const cost = repairFacilityCost(type, levels[type], conditions[type]);
        if (cost === 0) return;
        // Deduct cost from academy balance
        const { addBalance, academy } = require('@/stores/academyStore').useAcademyStore.getState();
        const { addTransaction } = require('@/stores/financeStore').useFinanceStore.getState();
        const def = FACILITY_DEFS.find((d) => d.type === type)!;
        addBalance(-(cost * 100)); // cost in pounds → pence
        addTransaction({
          amount: -cost,
          category: 'upkeep',
          description: `Repaired ${def.label}`,
          weekNumber: academy.weekNumber ?? 1,
        });
        set((state) => ({
          conditions: { ...state.conditions, [type]: 100 },
        }));
      },

      maxSquadSize: () => {
        const lvl = get().levels.physioClinic;
        return lvl === 0 ? 15 : 10 + lvl * 3;
      },

      analyticsUnlocked: () => get().levels.scoutingCenter > 0,

      totalWeeklyMaintenance: () => calculateTotalUpkeep(get().levels),
    }),
    {
      name: 'facility-store',
      storage: zustandStorage,
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          const old = (persistedState?.levels ?? {}) as Record<string, number>;
          return {
            ...persistedState,
            levels: {
              technicalZone:  old.trainingPitch  ?? 0,
              strengthSuite:  0,
              tacticalRoom:   0,
              physioClinic:   old.medicalLab     ?? 0,
              hydroPool:      0,
              scoutingCenter: old.analyticsSuite ?? 0,
            },
            conditions: DEFAULT_CONDITIONS,
          };
        }
        return persistedState as FacilityState;
      },
    }
  )
);
