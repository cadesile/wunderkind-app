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
 * Formula: baseXP × (1 + xpMultiplierTotal) × (1 + totalCoachPerformance / 100)
 * xpMultiplierTotal is the aggregated facility effect from computeFacilityEffects().
 */
export function calculateWeeklyXP(
  xpMultiplierTotal: number,
  totalCoachPerformance: number,
  baseXP: number,
): number {
  return baseXP * (1 + xpMultiplierTotal) * (1 + totalCoachPerformance / 100);
}

/**
 * Per-player weekly injury probability.
 *
 * Formula: max(0, baseInjuryProbability − injuryProbabilityDelta)
 * injuryProbabilityDelta is the aggregated facility effect from computeFacilityEffects().
 */
export function calculateInjuryProbability(
  injuryProbabilityDelta: number,
  baseInjuryProbability: number,
): number {
  return Math.max(0, baseInjuryProbability - injuryProbabilityDelta);
}

/**
 * Passive weekly reputation gain before tier drain and inactivity decay.
 *
 * Formula: sum of (reputationBonus × effectiveLevel) for each owned facility (level > 0).
 * effectiveLevel = level × (condition / 100), so poorly maintained facilities contribute less.
 */
export function calculateReputationDelta(
  facilityTemplates: Array<{ slug: string; reputationBonus: number }>,
  levels: Record<string, number>,
  conditions: Record<string, number>,
): number {
  return facilityTemplates.reduce((sum, template) => {
    const level = levels[template.slug] ?? 0;
    if (level === 0) return sum;
    const cond = conditions[template.slug] ?? 100;
    const effectiveLevel = level * (cond / 100);
    return sum + template.reputationBonus * effectiveLevel;
  }, 0);
}

/**
 * Injury duration in weeks for a given tier, reduced by the aggregated facility recovery delta.
 *
 * Formula: max(1, round(baseDuration − injuryRecoveryWeeksDelta))
 * injuryRecoveryWeeksDelta is the aggregated facility effect from computeFacilityEffects().
 */
export function calculateInjuryDuration(
  tier: { minWeeks: number; maxWeeks: number },
  injuryRecoveryWeeksDelta: number,
): number {
  const base = tier.minWeeks + Math.floor(Math.random() * (tier.maxWeeks - tier.minWeeks + 1));
  return Math.max(1, Math.round(base - injuryRecoveryWeeksDelta));
}
