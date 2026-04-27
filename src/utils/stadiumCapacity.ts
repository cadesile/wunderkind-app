import type { FacilityTemplate } from '@/types/facility';

/**
 * Estimates total stadium capacity by summing each owned facility's
 * contribution: Math.round(baseCost / 1000) × level.
 */
export function calculateStadiumCapacity(
  templates: FacilityTemplate[],
  levels: Record<string, number>,
): number {
  return templates.reduce((total, t) => {
    const level = levels[t.slug] ?? 0;
    if (level === 0) return total;
    return total + Math.round(t.baseCost / 1000) * level;
  }, 0);
}
