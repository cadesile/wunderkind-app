import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FacilityLevels, FacilityType, FACILITY_DEFS } from '@/types/facility';
import { zustandStorage } from '@/utils/storage';

const MAX_LEVEL = 10;

/** Weekly maintenance cost for a given level: level × 500 pence */
export function facilityMaintenanceCost(level: number): number {
  return level * 500;
}

/** Upgrade cost from current level → next level: nextLevel × baseCost */
export function facilityUpgradeCost(type: FacilityType, currentLevel: number): number {
  const def = FACILITY_DEFS.find((d) => d.type === type);
  if (!def || currentLevel >= MAX_LEVEL) return Infinity;
  return (currentLevel + 1) * def.baseCost;
}

interface FacilityState {
  levels: FacilityLevels;
  /** Returns true if upgrade succeeded, false if already at max */
  upgradeLevel: (type: FacilityType) => boolean;
  /** Derived: max squad size from Youth Hostel */
  maxSquadSize: () => number;
  /** Derived: whether the Analytics Suite is active */
  analyticsUnlocked: () => boolean;
  /** Total weekly maintenance cost across all facilities */
  totalWeeklyMaintenance: () => number;
}

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set, get) => ({
      levels: {
        trainingPitch: 0,
        medicalLab: 0,
        youthHostel: 0,
        analyticsSuite: 0,
        mediaCenter: 0,
      },
      upgradeLevel: (type) => {
        const current = get().levels[type];
        if (current >= MAX_LEVEL) return false;
        set((state) => ({
          levels: { ...state.levels, [type]: state.levels[type] + 1 },
        }));
        return true;
      },
      maxSquadSize: () => {
        const lvl = get().levels.youthHostel;
        return lvl === 0 ? 15 : 10 + lvl * 3;
      },
      analyticsUnlocked: () => get().levels.analyticsSuite > 0,
      totalWeeklyMaintenance: () =>
        Object.values(get().levels).reduce(
          (sum, level) => sum + facilityMaintenanceCost(level),
          0
        ),
    }),
    { name: 'facility-store', storage: zustandStorage }
  )
);
