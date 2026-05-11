import type { FacilityTemplate } from '@/types/facility';
import { useGameConfigStore } from '@/stores/gameConfigStore';

/**
 * Estimates total stadium capacity by summing each owned facility's
 * contribution: Math.round(baseCost / capacityCalculation) × level.
 */
export function calculateStadiumCapacity(
  templates: FacilityTemplate[],
  levels: Record<string, number>,
): number {
  const capacityCalculation = useGameConfigStore.getState().config.capacityCalculation ?? 1000;

  return templates.reduce((total, t) => {
    const level = levels[t.slug] ?? 0;
    if (level === 0) return total;
    return total + Math.round(t.baseCost / capacityCalculation) * level;
  }, 0);
}
