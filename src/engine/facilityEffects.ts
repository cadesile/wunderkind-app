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
  /** Total technical attribute growth boost */
  technicalGrowthMultiplierTotal: number;
  /** Total power attribute growth boost */
  powerGrowthMultiplierTotal: number;
  /** Total pace attribute growth boost */
  paceGrowthMultiplierTotal: number;
  /** Total vision attribute growth boost */
  visionGrowthMultiplierTotal: number;
  /** Total stamina attribute growth boost */
  staminaGrowthMultiplierTotal: number;
  /** Total heart attribute growth boost */
  heartGrowthMultiplierTotal: number;
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
  /** Weekly flat personality trait growth totals (summed from all facilities) */
  determinationGrowthTotal: number;
  professionalismGrowthTotal: number;
  ambitionGrowthTotal: number;
  loyaltyGrowthTotal: number;
  adaptabilityGrowthTotal: number;
  pressureGrowthTotal: number;
  temperamentGrowthTotal: number;
  consistencyGrowthTotal: number;
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
    paceGrowthMultiplierTotal: 0,
    visionGrowthMultiplierTotal: 0,
    staminaGrowthMultiplierTotal: 0,
    heartGrowthMultiplierTotal: 0,
    injuryProbabilityDelta: 0,
    injuryRecoveryWeeksDelta: 0,
    scoutErrorRangeDelta: 0,
    scoutRevealWeeksDelta: 0,
    cohesionBonusTotal: 0,
    determinationGrowthTotal: 0,
    professionalismGrowthTotal: 0,
    ambitionGrowthTotal: 0,
    loyaltyGrowthTotal: 0,
    adaptabilityGrowthTotal: 0,
    pressureGrowthTotal: 0,
    temperamentGrowthTotal: 0,
    consistencyGrowthTotal: 0,
  };

  for (const t of templates) {
    const ge = t.gameplayEffects;
    if (!ge) continue;
    const level = effectiveLevels[t.slug] ?? 0;
    if (level === 0) continue;

    fx.xpMultiplierTotal              += (ge.xpMultiplierPerLevel              ?? 0) * level;
    fx.technicalGrowthMultiplierTotal += (ge.technicalGrowthMultiplierPerLevel ?? 0) * level;
    fx.powerGrowthMultiplierTotal     += (ge.powerGrowthMultiplierPerLevel     ?? 0) * level;
    fx.paceGrowthMultiplierTotal      += (ge.paceGrowthMultiplierPerLevel      ?? 0) * level;
    fx.visionGrowthMultiplierTotal    += (ge.visionGrowthMultiplierPerLevel    ?? 0) * level;
    fx.staminaGrowthMultiplierTotal   += (ge.staminaGrowthMultiplierPerLevel   ?? 0) * level;
    fx.heartGrowthMultiplierTotal     += (ge.heartGrowthMultiplierPerLevel     ?? 0) * level;
    fx.injuryProbabilityDelta         += (ge.injuryProbabilityDeltaPerLevel    ?? 0) * level;
    fx.injuryRecoveryWeeksDelta       += (ge.injuryRecoveryWeeksDeltaPerLevel  ?? 0) * level;
    fx.scoutErrorRangeDelta           += (ge.scoutErrorRangeDeltaPerLevel      ?? 0) * level;
    fx.scoutRevealWeeksDelta          += (ge.scoutRevealWeeksDeltaPerLevel     ?? 0) * level;
    fx.cohesionBonusTotal             += (ge.cohesionBonusPerLevel             ?? 0) * level;
    fx.determinationGrowthTotal       += (ge.determinationGrowthPerLevel       ?? 0) * level;
    fx.professionalismGrowthTotal     += (ge.professionalismGrowthPerLevel     ?? 0) * level;
    fx.ambitionGrowthTotal            += (ge.ambitionGrowthPerLevel            ?? 0) * level;
    fx.loyaltyGrowthTotal             += (ge.loyaltyGrowthPerLevel             ?? 0) * level;
    fx.adaptabilityGrowthTotal        += (ge.adaptabilityGrowthPerLevel        ?? 0) * level;
    fx.pressureGrowthTotal            += (ge.pressureGrowthPerLevel            ?? 0) * level;
    fx.temperamentGrowthTotal         += (ge.temperamentGrowthPerLevel         ?? 0) * level;
    fx.consistencyGrowthTotal         += (ge.consistencyGrowthPerLevel         ?? 0) * level;
  }

  return fx;
}
