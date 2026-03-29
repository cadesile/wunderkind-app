export interface GameConfig {
  // ── Clique ────────────────────────────────────────────────────────────────
  /** Minimum pairwise relationship value for clique eligibility. Default: 20 */
  cliqueRelationshipThreshold: number;
  /** Max % of active squad in cliques combined across all cliques. Default: 30 */
  cliqueSquadCapPercent: number;
  /** Minimum academy tenure in weeks before clique eligibility. Default: 3 */
  cliqueMinTenureWeeks: number;

  // ── Pricing ───────────────────────────────────────────────────────────────
  /**
   * Scales all player transfer fees and market values.
   * fee_pence = OVR × rand(80–120) × playerFeeMultiplier × reputationMod
   * marketValue_pounds = OVR × playerFeeMultiplier
   * Default: 1000  (OVR 50 → ~£50,000 fee)
   */
  playerFeeMultiplier: number;

  // ── Engine constants ──────────────────────────────────────────────────────
  /** Base XP awarded per player per week before facility/coach multipliers. Default: 10 */
  baseXP: number;
  /** Per-player weekly injury probability before physio mitigation. Default: 0.05 */
  baseInjuryProbability: number;
  /** Trait value above which regression-to-mean pulls downward. Default: 14 */
  regressionUpperThreshold: number;
  /** Trait value below which regression-to-mean pulls upward. Default: 7 */
  regressionLowerThreshold: number;
  /** Passive weekly reputation gain base (before facility bonus). Default: 0.15 */
  reputationDeltaBase: number;
  /** Reputation gain per effective scouting-center level. Default: 0.15 */
  reputationDeltaFacilityMultiplier: number;
  /** Injury severity weight for minor injuries. Default: 60 */
  injuryMinorWeight: number;
  /** Injury severity weight for moderate injuries. Default: 30 */
  injuryModerateWeight: number;
  /** Injury severity weight for serious injuries. Default: 10 */
  injurySeriousWeight: number;

  // ── Scouting ──────────────────────────────────────────────────────────
  /** Morale value below which a scout makes no weekly progress. Default: 40 */
  scoutMoraleThreshold: number;
  /** Weekly ticks required before an assigned player is revealed. Default: 2 */
  scoutRevealWeeks: number;
  /** Max ±ability error range, scaled by (100 - successRate) / 100. Default: 30 */
  scoutAbilityErrorRange: number;
  /** Max players a single scout can be assigned to simultaneously. Default: 5 */
  scoutMaxAssignments: number;
  /**
   * Ascending probability breakpoints for the weekly mission gem roll.
   * roll < [0] → 0 found; < [1] → 1; < [2] → 2; < [3] → 3; else → 4
   * Default: [0.25, 0.75, 0.85, 0.94]
   */
  missionGemRollThresholds: [number, number, number, number];
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  cliqueRelationshipThreshold: 20,
  cliqueSquadCapPercent: 30,
  cliqueMinTenureWeeks: 3,

  playerFeeMultiplier: 1000,

  baseXP: 10,
  baseInjuryProbability: 0.05,
  regressionUpperThreshold: 14,
  regressionLowerThreshold: 7,
  reputationDeltaBase: 0.15,
  reputationDeltaFacilityMultiplier: 0.15,
  injuryMinorWeight: 60,
  injuryModerateWeight: 30,
  injurySeriousWeight: 10,

  scoutMoraleThreshold: 40,
  scoutRevealWeeks: 2,
  scoutAbilityErrorRange: 30,
  scoutMaxAssignments: 5,
  missionGemRollThresholds: [0.25, 0.75, 0.85, 0.94],
};
