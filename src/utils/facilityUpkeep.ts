import type { FacilityType, FacilityLevels } from '../types/facility';

/** Base weekly upkeep costs per facility type (in pence). Level 0 = free. */
const BASE_UPKEEP_COSTS: Record<FacilityType, number> = {
  trainingPitch:  500, // 500p = £5/week base
  medicalLab:     300, // 300p = £3/week base
  youthHostel:    150, // 150p = £1.50/week base
  analyticsSuite: 200, // 200p = £2/week base
  mediaCenter:    200, // 200p = £2/week base
};

/**
 * Calculate weekly upkeep cost for a facility.
 * Formula: baseCost × (1.5 ^ level). Level 0 = free.
 * @returns Weekly upkeep in pence (whole pounds × 100).
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
