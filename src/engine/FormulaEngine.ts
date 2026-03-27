/**
 * FormulaEngine — pure calculation functions for the Weekly Tick.
 *
 * All formulas accept explicit parameters so they can be driven by
 * server-side RuntimeConfig (GameConfig) rather than hardcoded constants.
 * Every function is stateless and side-effect-free.
 */

/**
 * Weekly XP gained by each player.
 *
 * Formula: baseXP × (1 + technicalZoneEffective × 0.05) × (1 + totalCoachPerformance / 100)
 */
export function calculateWeeklyXP(
  technicalZoneEffective: number,
  totalCoachPerformance: number,
  baseXP: number,
): number {
  return baseXP * (1 + technicalZoneEffective * 0.05) * (1 + totalCoachPerformance / 100);
}

/**
 * Per-player weekly injury probability.
 *
 * Formula: max(0, baseInjuryProbability × (1 − physioClinicEffective × 0.08))
 */
export function calculateInjuryProbability(
  physioClinicEffective: number,
  baseInjuryProbability: number,
): number {
  return Math.max(0, baseInjuryProbability * (1 - physioClinicEffective * 0.08));
}

/**
 * Passive weekly reputation gain before tier drain and inactivity decay.
 *
 * Formula: reputationDeltaBase + mediaCenterEffective × reputationDeltaFacilityMultiplier
 */
export function calculateReputationDelta(
  mediaCenterEffective: number,
  reputationDeltaBase: number,
  reputationDeltaFacilityMultiplier: number,
): number {
  return reputationDeltaBase + mediaCenterEffective * reputationDeltaFacilityMultiplier;
}

/**
 * Injury duration in weeks for a given tier, reduced by physio and hydro facilities.
 *
 * Uses fixed 0.08 / 0.10 per-level multipliers (not config-driven).
 */
export function calculateInjuryDuration(
  tier: { minWeeks: number; maxWeeks: number },
  physioClinicEffective: number,
  hydroPoolEffective: number,
): number {
  const base = tier.minWeeks + Math.floor(Math.random() * (tier.maxWeeks - tier.minWeeks + 1));
  const reduction = (1 - physioClinicEffective * 0.08) * (1 - hydroPoolEffective * 0.10);
  const reduced = Math.round(base * Math.max(reduction, 0.2));
  return Math.max(reduced, 1);
}
