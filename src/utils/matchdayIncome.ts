import type { FacilityTemplate, FacilityLevels, FacilityConditions } from '@/types/facility';

/**
 * Calculates total matchday income in pence for a single home game.
 *
 * Formula per facility:
 *   effectiveLevel  = level × (condition / 100)
 *   facilityIncome  = matchdayIncome × effectiveLevel × matchdayIncomeMultiplier
 *
 * Total across all income-generating facilities:
 *   total = sum(facilityIncome) × (1 + reputation / 100)
 *
 * Returns 0 when no facilities have matchdayIncome configured or all levels are 0.
 * Returns a floored integer (no fractional pence).
 *
 * @param templates  - Live FacilityTemplate array from facilityStore
 * @param levels     - Current facility levels from facilityStore
 * @param conditions - Current facility conditions (0–100) from facilityStore
 * @param reputation - Club reputation (0–100) from clubStore
 */
export function calculateMatchdayIncome(
  templates: FacilityTemplate[],
  levels: FacilityLevels,
  conditions: FacilityConditions,
  reputation: number,
): number {
  let subtotal = 0;

  for (const template of templates) {
    if (template.matchdayIncome === null || template.matchdayIncomeMultiplier === null) {
      continue;
    }

    const level = levels[template.slug] ?? 0;
    if (level === 0) continue;

    const condition = conditions[template.slug] ?? 0;
    const effectiveLevel = level * (condition / 100);
    subtotal += template.matchdayIncome * effectiveLevel * template.matchdayIncomeMultiplier;
  }

  if (subtotal === 0) return 0;

  // Fan Happiness Multiplier
  let fanMultiplier = 1.0;
  try {
    const { useFanStore } = require('@/stores/fanStore');
    const { FanEngine } = require('@/engine/FanEngine');
    const { useClubStore } = require('@/stores/clubStore');
    
    const currentWeek = useClubStore.getState().club.weekNumber ?? 1;
    const score = FanEngine.calculateScore(currentWeek);
    const tier = FanEngine.getTier(score);
    
    const multipliers: Record<string, number> = {
      'Thrilled': 1.2,
      'Happy': 1.1,
      'Neutral': 1.0,
      'Disappointed': 0.9,
      'Angry': 0.8,
    };
    fanMultiplier = multipliers[tier] ?? 1.0;
  } catch (e) {
    // Fallback if fan store not available (e.g. initial setup)
    fanMultiplier = 1.0;
  }

  const total = subtotal * (1 + reputation / 100) * fanMultiplier;
  return Math.floor(total);
}
