import type { FacilityTemplate, FacilityLevels, FacilityConditions } from '@/types/facility';
import { useGameConfigStore } from '@/stores/gameConfigStore';

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
    // Stand income is calculated separately via calculateStandIncome
    if (template.slug.endsWith('_stand')) continue;

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

/**
 * Combined stand income for a single home match.
 *
 * All *_stand facilities contribute to a shared seating capacity:
 *   seatsPerLevel = Math.round(baseCost / capacityCalculation)
 *   effectiveSeats = seatsPerLevel × level × (condition / 100)
 *
 * Expected attendance = effectiveCapacity × tierFillPct
 * Income (pence)      = attendance × ticketPricePence
 *
 * Tier fill midpoints (mirrors SimulationService TIER_RANGES):
 *   Local 35% | Regional 50% | National 70% | Elite 85%
 */
export function calculateStandIncome(
  templates: FacilityTemplate[],
  levels: FacilityLevels,
  conditions: FacilityConditions,
  reputationTier: string,
  ticketPricePence: number,
): number {
  const TIER_FILL: Record<string, number> = {
    Local:    0.35,
    Regional: 0.50,
    National: 0.70,
    Elite:    0.85,
  };
  const fillPct = TIER_FILL[reputationTier] ?? 0.35;
  const capacityCalculation = useGameConfigStore.getState().config.capacityCalculation ?? 1000;

  let effectiveCapacity = 0;
  for (const t of templates) {
    if (!t.slug.endsWith('_stand')) continue;
    const level = levels[t.slug] ?? 0;
    if (level === 0) continue;
    const condition = conditions[t.slug] ?? 100;
    const seatsPerLevel = Math.round(t.baseCost / capacityCalculation);
    effectiveCapacity += seatsPerLevel * level * (condition / 100);
  }

  if (effectiveCapacity === 0 || ticketPricePence <= 0) return 0;

  const attendance = Math.round(effectiveCapacity * fillPct);
  return attendance * ticketPricePence;
}
