/** Canonical facility type slug — matches backend FacilityTemplate.slug */
export type FacilityType = string;

/** Maps each facility slug to its current level (0 = not built) */
export type FacilityLevels = Record<string, number>;

/** Maps each facility slug to its current condition (0–100%) */
export type FacilityConditions = Record<string, number>;

/** Shape of a facility template as delivered by the backend sync response */
export interface FacilityTemplate {
  slug: string;
  label: string;
  description: string;
  /** TRAINING | MEDICAL | SCOUTING | STADIUM */
  category: 'TRAINING' | 'MEDICAL' | 'SCOUTING' | 'STADIUM';
  /** Upgrade cost base in pence. App formula: (currentLevel + 1) × baseCost */
  baseCost: number;
  /** Weekly upkeep in pence at level 1. App formula: base × 1.5^level */
  weeklyUpkeepBase: number;
  /** Base income per home game in pence. null = no matchday income. */
  matchdayIncome: number | null;
  /** Per-level income multiplier. Formula: matchdayIncome × effectiveLevel × multiplier */
  matchdayIncomeMultiplier: number | null;
  reputationBonus: number;
  maxLevel: number;
  /** Weekly condition decay base. App formula: decayBase + level */
  decayBase: number;
  sortOrder: number;
  /**
   * Per-level gameplay effect deltas applied during the weekly tick.
   * Each value is multiplied by the facility's effective level (level × condition/100).
   * Keys: xpMultiplierPerLevel, technicalGrowthMultiplierPerLevel, powerGrowthMultiplierPerLevel,
   *       injuryProbabilityDeltaPerLevel, injuryRecoveryWeeksDeltaPerLevel,
   *       scoutErrorRangeDeltaPerLevel, scoutRevealWeeksDeltaPerLevel, cohesionBonusPerLevel
   */
  gameplayEffects?: Record<string, number>;
}

// ─── Static fallback ──────────────────────────────────────────────────────────
// Used until the first successful sync delivers live templates from the backend.

export const FALLBACK_FACILITY_TEMPLATES: FacilityTemplate[] = [
  // ── Stadium stands ──────────────────────────────────────────────────────────
  // Income is NOT computed from matchdayIncome/matchdayIncomeMultiplier.
  // Instead, all *_stand income is combined: attendance × ticketPrice.
  // Capacity per level = Math.round(baseCost / 1000) seats.
  {
    slug:                    'main_stand',
    label:                   'Main Stand',
    description:             'The centrepiece of your ground. Brings in the bulk of your matchday income.',
    category:                'STADIUM',
    baseCost:                1_000_000,
    weeklyUpkeepBase:        800,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         1.5,
    maxLevel:                5,
    decayBase:               1.5,
    sortOrder:               7,
  },
  {
    slug:                    'north_stand',
    label:                   'North Stand',
    description:             'A terraced end favoured by the most vocal supporters.',
    category:                'STADIUM',
    baseCost:                600_000,
    weeklyUpkeepBase:        500,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         0.8,
    maxLevel:                5,
    decayBase:               1.5,
    sortOrder:               8,
  },
  {
    slug:                    'away_stand',
    label:                   'Away Stand',
    description:             'Designated section for visiting supporters. Required for higher league licences.',
    category:                'STADIUM',
    baseCost:                400_000,
    weeklyUpkeepBase:        300,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         0.4,
    maxLevel:                3,
    decayBase:               1.5,
    sortOrder:               9,
  },
  // ── Training ────────────────────────────────────────────────────────────────
  {
    slug:                    'technical_zone',
    label:                   'Technical Zone',
    description:             'The heartbeat of your club. Better facilities mean faster technical improvement.',
    category:                'TRAINING',
    baseCost:                500000,
    weeklyUpkeepBase:        500,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         1.2,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               1,
    gameplayEffects: { xpMultiplierPerLevel: 0.1, technicalGrowthMultiplierPerLevel: 0.05 },
  },
  {
    slug:                    'strength_suite',
    label:                   'Strength Suite',
    description:             'Dedicated gym and conditioning equipment for physical development.',
    category:                'TRAINING',
    baseCost:                600000,
    weeklyUpkeepBase:        400,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         0.8,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               2,
    gameplayEffects: { powerGrowthMultiplierPerLevel: 0.06, technicalGrowthMultiplierPerLevel: 0.02 },
  },
  {
    slug:                    'physio_clinic',
    label:                   'Physio Clinic',
    description:             'State-of-the-art rehabilitation and injury prevention. Also expands squad capacity.',
    category:                'MEDICAL',
    baseCost:                800000,
    weeklyUpkeepBase:        600,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         1.0,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               3,
    gameplayEffects: { injuryProbabilityDeltaPerLevel: 0.01, injuryRecoveryWeeksDeltaPerLevel: 0.25 },
  },
  {
    slug:                    'hydro_pool',
    label:                   'Hydro Pool',
    description:             'Hydrotherapy and recovery suite to get players back on their feet faster.',
    category:                'MEDICAL',
    baseCost:                900000,
    weeklyUpkeepBase:        700,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         0.6,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               4,
    gameplayEffects: { injuryRecoveryWeeksDeltaPerLevel: 0.5 },
  },
  {
    slug:                    'tactical_room',
    label:                   'Tactical Room',
    description:             'Video analysis and tactical boards to sharpen game intelligence.',
    category:                'SCOUTING',
    baseCost:                700000,
    weeklyUpkeepBase:        350,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         1.0,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               5,
    gameplayEffects: { cohesionBonusPerLevel: 0.04 },
  },
  {
    slug:                    'scouting_center',
    label:                   'Scouting Center',
    description:             'Talent identification hub that drives scouting intelligence and club reputation.',
    category:                'SCOUTING',
    baseCost:                1000000,
    weeklyUpkeepBase:        300,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         2.0,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               6,
    gameplayEffects: { scoutErrorRangeDeltaPerLevel: 5, scoutRevealWeeksDeltaPerLevel: 0.25 },
  },
];

/**
 * Weekly condition decay in % points.
 * Formula: decayBase + level  (level 0 = no decay)
 */
export function weeklyDecayRate(level: number, decayBase: number): number {
  if (level === 0) return 0;
  return decayBase + level;
}

/**
 * Repair cost in PENCE to restore a facility to 100% condition.
 * Formula: ceil(effectiveUpkeepPence × degradation% × 10)
 * where effectiveUpkeepPence = weeklyUpkeepBase × 1.5^level
 * (i.e. full repair costs ~10× the facility's weekly upkeep, pro-rated by how degraded it is)
 *
 * Returns pence — callers must divide by 100 before passing to addTransaction (whole pounds).
 * Use formatCurrencyWhole() for display (it expects pence).
 */
export function repairFacilityCost(
  level: number,
  condition: number,
  weeklyUpkeepBase: number,  // pence
): number {  // pence
  if (level === 0 || condition >= 100) return 0;
  const degradationPct = (100 - condition) / 100;
  const effectiveUpkeepPence = Math.floor(weeklyUpkeepBase * Math.pow(1.5, level));
  return Math.ceil(effectiveUpkeepPence * degradationPct * 10);
}
