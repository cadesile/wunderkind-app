import type { FacilityTemplate, FacilityLevels } from '../types/facility';

/**
 * Calculate weekly upkeep cost for a facility.
 * Formula: weeklyUpkeepBase × 1.5^level. Level 0 = free.
 * @returns Weekly upkeep in pence.
 */
export function calculateFacilityUpkeep(template: FacilityTemplate, level: number): number {
  if (level === 0) return 0;
  return Math.floor(template.weeklyUpkeepBase * Math.pow(1.5, level));
}

/**
 * Calculate total weekly upkeep across all facilities.
 * @returns Total weekly upkeep in pence.
 */
export function calculateTotalUpkeep(templates: FacilityTemplate[], levels: FacilityLevels): number {
  return templates.reduce(
    (total, t) => total + calculateFacilityUpkeep(t, levels[t.slug] ?? 0),
    0,
  );
}
