import type { FacilityType, FacilityLevels } from '../types/facility';

/** Base weekly upkeep costs per facility type (in pence). Level 0 = free. */
const BASE_UPKEEP_COSTS: Record<FacilityType, number> = {
  technicalZone:  500, // £5/wk base
  strengthSuite:  400, // £4/wk base
  tacticalRoom:   350, // £3.50/wk base
  physioClinic:   600, // £6/wk base
  hydroPool:      700, // £7/wk base
  scoutingCenter: 300, // £3/wk base
};

/**
 * Calculate weekly upkeep cost for a facility.
 * Formula: baseCost × (1.5 ^ level). Level 0 = free.
 * @returns Weekly upkeep in pence.
 */
export function calculateFacilityUpkeep(type: FacilityType, level: number): number {
  if (level === 0) return 0;
  return Math.floor(BASE_UPKEEP_COSTS[type] * Math.pow(1.5, level));
}

/**
 * Calculate total weekly upkeep across all facilities.
 * @returns Total weekly upkeep in pence.
 */
export function calculateTotalUpkeep(levels: FacilityLevels): number {
  return (Object.entries(levels) as [FacilityType, number][]).reduce(
    (total, [type, level]) => total + calculateFacilityUpkeep(type, level),
    0,
  );
}
