// ─── League ability ranges ────────────────────────────────────────────────────

export interface LeagueTierRange {
  tier: number;
  min: number;
  max: number;
}

export interface CountryAbilityRanges {
  country: string;
  leagues: LeagueTierRange[];
}

export type LeaguePlayerAbilityRanges = CountryAbilityRanges[];

const TIER_DEFAULTS: Record<number, LeagueTierRange> = {
  1: { tier: 1, min: 55, max: 95 },
  2: { tier: 2, min: 45, max: 65 },
  3: { tier: 3, min: 35, max: 55 },
  4: { tier: 4, min: 25, max: 50 },
  5: { tier: 5, min: 25, max: 40 },
  6: { tier: 6, min: 15, max: 35 },
  7: { tier: 7, min: 15, max: 25 },
  8: { tier: 8, min: 5,  max: 15 },
};

export function resolveAbilityRange(
  ranges: LeaguePlayerAbilityRanges,
  country: string,
  tier: number,
): LeagueTierRange {
  const countryEntry = ranges.find((e) => e.country === country);
  return countryEntry?.leagues.find((l) => l.tier === tier)
    ?? TIER_DEFAULTS[tier]
    ?? { tier, min: 10, max: 60 };
}

// ─── GameConfig ───────────────────────────────────────────────────────────────

export interface GameConfig {
  /** Per-country, per-league-tier ability ranges for NPC player generation. */
  leaguePlayerAbilityRanges: LeaguePlayerAbilityRanges;
  // ── Squad Configuration ───────────────────────────────────────────────────
  /** Minimum players required in active squad. Default: 11 */
  squadSizeMin: number;
  /** Maximum players allowed in active squad. Default: 25 */
  squadSizeMax: number;

  // ── Clique ────────────────────────────────────────────────────────────────
  /** Minimum pairwise relationship value for clique eligibility. Default: 20 */
  cliqueRelationshipThreshold: number;
  /** Max % of active squad in cliques combined across all cliques. Default: 30 */
  cliqueSquadCapPercent: number;
  /** Minimum club tenure in weeks before clique eligibility. Default: 3 */
  cliqueMinTenureWeeks: number;

  // ── Pricing ───────────────────────────────────────────────────────────────
  /**
   * Scales all player transfer fees and market values.
   * fee_pence = OVR × rand(80–120) × playerFeeMultiplier × reputationMod
   * marketValue_pounds = OVR × playerFeeMultiplier
   * Default: 1000  (OVR 50 → ~£50,000 fee)
   */
  playerFeeMultiplier: number;
  /**
   * Global multiplier applied to every player's weekly wage before deducting from balance.
   * Formula: effectiveWages = Σ(player.wage) × playerWageMultiplier
   * Default: 1.0  (no adjustment)
   */
  playerWageMultiplier: number;

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

  // ── Morale ────────────────────────────────────────────────────────────────
  /** Lower bound of the random base morale range for newly assigned players/coaches/scouts. Default: 50 */
  defaultMoraleMin: number;
  /** Upper bound of the random base morale range for newly assigned players/coaches/scouts. Default: 80 */
  defaultMoraleMax: number;

  // ── Behavioural incident frequency ────────────────────────────────────────
  /** Professionalism trait value below which a late-to-training incident can trigger. Default: 6 */
  incidentLowProfessionalismThreshold: number;
  /** Weekly probability of a late-to-training incident when professionalism is below threshold. Default: 0.3 */
  incidentLowProfessionalismChance: number;
  /** Determination trait value above which a bonus extra-effort incident can trigger. Default: 15 */
  incidentHighDeterminationThreshold: number;
  /** Weekly probability of an extra-effort bonus incident when determination is above threshold. Default: 0.25 */
  incidentHighDeterminationChance: number;
  /** Base weekly probability that any player pair has a training altercation. Default: 0.10 */
  incidentAltercationBaseChance: number;
  /**
   * Floor probability of an altercation escalating to "serious" when the pair already has a negative relationship.
   * Final chance = incidentAltercationSeriousBase + (avgTemperament / 20) × incidentAltercationSeriousTemperamentScale
   * Default: 0.2
   */
  incidentAltercationSeriousBase: number;
  /**
   * Temperament scaling factor for serious altercation escalation.
   * Higher = more volatile squads produce more serious incidents.
   * Default: 0.5
   */
  incidentAltercationSeriousTemperamentScale: number;

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

  // ── Guardian Complaints ────────────────────────────────────────────────
  /** Player morale boost when manager convinces a guardian. Default: 5 */
  guardianConvinceMoraleBoost: number;
  /** Guardian loyalty boost on convince. Default: 8 */
  guardianConvinceGuardianLoyaltyBoost: number;
  /** Guardian demand level increase on convince. Default: 1 */
  guardianConvinceGuardianDemandIncrease: number;
  /** Player morale penalty when manager ignores a complaint. Default: 8 */
  guardianIgnoreMoralePenalty: number;
  /** Player loyalty trait penalty on ignore. Default: 3 */
  guardianIgnoreLoyaltyTraitPenalty: number;
  /** Guardian loyalty penalty on ignore. Default: 12 */
  guardianIgnoreGuardianLoyaltyPenalty: number;
  /** Guardian demand level increase on ignore. Default: 2 */
  guardianIgnoreGuardianDemandIncrease: number;
  /** Sibling morale penalty on ignore. Default: 5 */
  guardianIgnoreSiblingMoralePenalty: number;
  /** Sibling loyalty trait penalty on ignore. Default: 2 */
  guardianIgnoreSiblingLoyaltyTraitPenalty: number;

  // ── Retirement ────────────────────────────────────────────────────────────
  /** Minimum age at which a player can voluntarily retire. Default: 30 */
  retirementMinAge: number;
  /** Age at which retirement is forced (player retires regardless of roll). Default: 38 */
  retirementMaxAge: number;
  /**
   * Maximum retirement probability, applied when age = retirementMaxAge - 1.
   * Probability scales linearly from 0 at retirementMinAge to retirementChance at retirementMaxAge - 1.
   * Default: 0.35
   */
  retirementChance: number;

  // ── Fan base season changes ───────────────────────────────────────────────────
  /**
   * Fan count multiplier increase applied at season end when a club is promoted.
   * e.g. 0.10 = 10% increase. Default: 0.10
   */
  fanBasePromotionIncrease: number;
  /**
   * Fan count multiplier decrease applied at season end when a club is relegated.
   * e.g. 0.05 = 5% decrease. Default: 0.05
   */
  fanBaseRelegationDecrease: number;

  // ── Facility income ───────────────────────────────────────────────────────
  /**
   * Percentage of full facility income earned on weeks without a home match.
   * 0 = no income on non-matchdays (default), 100 = full income regardless of fixtures.
   * Smallint 0–100, configured in admin.
   */
  nonMatchFacilityIncomePercent: number;

  // ── Match simulation ─────────────────────────────────────────────────────
  /**
   * Maps each playing style to the player attributes that receive a bonus during match simulation.
   * e.g. { POSSESSION: ["technical", "vision"], COUNTER: ["pace", "stamina"] }
   * Configured in the admin panel. Empty object = no style-based attribute bonuses.
   */
  playingStyleInfluence: Record<string, string[]>;

  // ── Notification frequencies ──────────────────────────────────────────────
  /**
   * How often (in game weeks) to check facility conditions and send a
   * maintenance reminder when any built facility is degraded. Default: 4
   */
  facilityMaintenanceFrequencyWeeks: number;
  /**
   * How often (in game weeks) to send periodic system-level notifications
   * (e.g. development digests, club health summaries). Default: 8
   */
  systemNotificationFrequencyWeeks: number;

  // ── Manager Sacking ───────────────────────────────────────────────────────
  /**
   * Win ratio (0–1) below which the chairman considers sacking the manager.
   * Evaluated after managerSackingMinGames have been played. Default: 0.3
   */
  managerSackingWinRatioTrigger: number;
  /**
   * Win ratio (0–1) the manager must sustain to recover from a sacking threat.
   * Default: 0.4
   */
  managerSackingWinRatioRecovery: number;
  /** Minimum games played before sacking logic is evaluated. Default: 10 */
  managerSackingMinGames: number;
  /**
   * Weekly fan attendance penalty (absolute count) while a sacking threat is active.
   * Default: 200
   */
  managerSackingAttendancePenaltyPerWeek: number;

  // ── Developer / Debug ────────────────────────────────────────────────
  /** When true, the in-app debug log panel cog icon is visible in the tab bar. Default: false */
  debugLoggingEnabled: boolean;

  // ── League Finances ───────────────────────────────────────────────────
  /** Per-season income range for SMALL company sponsors (pence). */
  smallSponsorMin: number;
  smallSponsorMax: number;
  /** Per-season income range for MEDIUM company sponsors (pence). */
  mediumSponsorMin: number;
  mediumSponsorMax: number;
  /** Per-season income range for LARGE company sponsors (pence). */
  largeSponsorMin: number;
  largeSponsorMax: number;
  /** % reduction per finishing position for leaguePositionPot distribution. */
  leaguePositionDecreasePercent: number;

  // ── Staff ─────────────────────────────────────────────────────────────────
  /** StaffRole enum values from the backend — used as filter options in the Hire screen. */
  staffRoles: import('./coach').StaffRole[];
  /** Maximum number of coaches (role: coach / assistant_coach) allowed per club. */
  maxCoachesPerClub: number;
  /** Maximum number of managers allowed per club. */
  maxManagersPerClub: number;
  /** Maximum number of directors of football allowed per club. */
  maxDirectorsOfFootballPerClub: number;
  /** Maximum number of facility managers allowed per club. */
  maxFacilityManagersPerClub: number;
  /** Maximum number of chairmen allowed per club. */
  maxChairmensPerClub: number;
  /** Maximum number of scouts allowed per club. */
  maxScoutsPerClub: number;

  // ── Offer probabilities (per reputation tier, 0–1) ────────────────────────
  /** Weekly probability of a sponsor offer when club is Local tier. */
  sponsorProbabilityLocal: number;
  /** Weekly probability of a sponsor offer when club is Regional tier. */
  sponsorProbabilityRegional: number;
  /** Weekly probability of a sponsor offer when club is National tier. */
  sponsorProbabilityNational: number;
  /** Weekly probability of a sponsor offer when club is Elite tier. */
  sponsorProbabilityElite: number;
  /** Weekly probability of an investor offer when club is Local tier. */
  investorProbabilityLocal: number;
  /** Weekly probability of an investor offer when club is Regional tier. */
  investorProbabilityRegional: number;
  /** Weekly probability of an investor offer when club is National tier. */
  investorProbabilityNational: number;
  /** Weekly probability of an investor offer when club is Elite tier. */
  investorProbabilityElite: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  leaguePlayerAbilityRanges: [],

  squadSizeMin: 11,
  squadSizeMax: 25,

  cliqueRelationshipThreshold: 20,
  cliqueSquadCapPercent: 30,
  cliqueMinTenureWeeks: 3,

  playerFeeMultiplier: 1000,
  playerWageMultiplier: 1.0,

  baseXP: 10,
  baseInjuryProbability: 0.05,
  regressionUpperThreshold: 14,
  regressionLowerThreshold: 7,
  reputationDeltaBase: 0.15,
  reputationDeltaFacilityMultiplier: 0.15,
  injuryMinorWeight: 60,
  injuryModerateWeight: 30,
  injurySeriousWeight: 10,

  defaultMoraleMin: 50,
  defaultMoraleMax: 80,

  incidentLowProfessionalismThreshold: 6,
  incidentLowProfessionalismChance: 0.3,
  incidentHighDeterminationThreshold: 15,
  incidentHighDeterminationChance: 0.25,
  incidentAltercationBaseChance: 0.10,
  incidentAltercationSeriousBase: 0.2,
  incidentAltercationSeriousTemperamentScale: 0.5,

  scoutMoraleThreshold: 40,
  scoutRevealWeeks: 2,
  scoutAbilityErrorRange: 30,
  scoutMaxAssignments: 5,
  missionGemRollThresholds: [0.25, 0.75, 0.85, 0.94],

  guardianConvinceMoraleBoost: 5,
  guardianConvinceGuardianLoyaltyBoost: 8,
  guardianConvinceGuardianDemandIncrease: 1,
  guardianIgnoreMoralePenalty: 8,
  guardianIgnoreLoyaltyTraitPenalty: 3,
  guardianIgnoreGuardianLoyaltyPenalty: 12,
  guardianIgnoreGuardianDemandIncrease: 2,
  guardianIgnoreSiblingMoralePenalty: 5,
  guardianIgnoreSiblingLoyaltyTraitPenalty: 2,

  retirementMinAge: 30,
  retirementMaxAge: 38,
  retirementChance: 0.35,

  fanBasePromotionIncrease: 0.10,
  fanBaseRelegationDecrease: 0.05,

  nonMatchFacilityIncomePercent: 0,

  playingStyleInfluence: {},

  facilityMaintenanceFrequencyWeeks: 4,
  systemNotificationFrequencyWeeks: 8,

  managerSackingWinRatioTrigger: 0.3,
  managerSackingWinRatioRecovery: 0.4,
  managerSackingMinGames: 10,
  managerSackingAttendancePenaltyPerWeek: 200,

  debugLoggingEnabled: false,

  smallSponsorMin: 1000000,
  smallSponsorMax: 5000000,
  mediumSponsorMin: 10000000,
  mediumSponsorMax: 30000000,
  largeSponsorMin: 50000000,
  largeSponsorMax: 200000000,
  leaguePositionDecreasePercent: 5,

  staffRoles: [],
  maxCoachesPerClub: 15,
  maxManagersPerClub: 1,
  maxDirectorsOfFootballPerClub: 1,
  maxFacilityManagersPerClub: 1,
  maxChairmensPerClub: 1,
  maxScoutsPerClub: 3,

  sponsorProbabilityLocal:    1,
  sponsorProbabilityRegional: 1,
  sponsorProbabilityNational: 1,
  sponsorProbabilityElite:    1,
  investorProbabilityLocal:    0.2,
  investorProbabilityRegional: 0.12,
  investorProbabilityNational: 0.06,
  investorProbabilityElite:    0.02,
};
