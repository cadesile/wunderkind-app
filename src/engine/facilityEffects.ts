import type { FacilityTemplate } from '@/types/facility';

/**
 * Aggregated gameplay effect totals derived from all facility templates at their
 * current effective levels (level × condition/100).
 *
 * Each value is the sum of (gameplayEffects[key] × effectiveLevel) across all
 * facility templates, and is applied directly in the weekly tick.
 */
export interface FacilityEffects {
  /** Total XP multiplier boost: effectiveXP = baseXP × (1 + xpMultiplierTotal) */
  xpMultiplierTotal: number;
  /** Total technical growth boost: facilityMod = 1 + technicalGrowthMultiplierTotal */
  technicalGrowthMultiplierTotal: number;
  /** Total power/stamina growth boost: strengthMod = 1 + powerGrowthMultiplierTotal */
  powerGrowthMultiplierTotal: number;
  /** Flat deduction from base injury probability: effectiveProb = baseProb - injuryProbabilityDelta */
  injuryProbabilityDelta: number;
  /** Flat week reduction from injury duration: effectiveDuration = baseDuration - injuryRecoveryWeeksDelta */
  injuryRecoveryWeeksDelta: number;
  /** Flat deduction from scout ability error range */
  scoutErrorRangeDelta: number;
  /** Flat week reduction from scout reveal time (floored at 1) */
  scoutRevealWeeksDelta: number;
  /** Total tactical cohesion boost: tacticalBoost = 1 + cohesionBonusTotal */
  cohesionBonusTotal: number;
}

/**
 * Computes aggregated gameplay effects from all facility templates at their current
 * effective levels. Pass the same effectiveLevels map used throughout the weekly tick
 * (i.e. level × condition/100 for each slug).
 */
export function computeFacilityEffects(
  templates: FacilityTemplate[],
  effectiveLevels: Record<string, number>,
): FacilityEffects {
  const fx: FacilityEffects = {
    xpMultiplierTotal: 0,
    technicalGrowthMultiplierTotal: 0,
    powerGrowthMultiplierTotal: 0,
    injuryProbabilityDelta: 0,
    injuryRecoveryWeeksDelta: 0,
    scoutErrorRangeDelta: 0,
    scoutRevealWeeksDelta: 0,
    cohesionBonusTotal: 0,
  };

  for (const t of templates) {
    const ge = t.gameplayEffects;
    if (!ge) continue;
    const level = effectiveLevels[t.slug] ?? 0;
    if (level === 0) continue;

    fx.xpMultiplierTotal              += (ge.xpMultiplierPerLevel              ?? 0) * level;
    fx.technicalGrowthMultiplierTotal += (ge.technicalGrowthMultiplierPerLevel ?? 0) * level;
    fx.powerGrowthMultiplierTotal     += (ge.powerGrowthMultiplierPerLevel     ?? 0) * level;
    fx.injuryProbabilityDelta         += (ge.injuryProbabilityDeltaPerLevel    ?? 0) * level;
    fx.injuryRecoveryWeeksDelta       += (ge.injuryRecoveryWeeksDeltaPerLevel  ?? 0) * level;
    fx.scoutErrorRangeDelta           += (ge.scoutErrorRangeDeltaPerLevel      ?? 0) * level;
    fx.scoutRevealWeeksDelta          += (ge.scoutRevealWeeksDeltaPerLevel     ?? 0) * level;
    fx.cohesionBonusTotal             += (ge.cohesionBonusPerLevel             ?? 0) * level;
  }

  return fx;
}
