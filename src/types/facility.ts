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
  /** TRAINING | MEDICAL | SCOUTING */
  category: 'TRAINING' | 'MEDICAL' | 'SCOUTING';
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
}

// ─── Static fallback ──────────────────────────────────────────────────────────
// Used until the first successful sync delivers live templates from the backend.

export const FALLBACK_FACILITY_TEMPLATES: FacilityTemplate[] = [
  {
    slug:                    'technical_zone',
    label:                   'Technical Zone',
    description:             'The heartbeat of your academy. Better facilities mean faster technical improvement.',
    category:                'TRAINING',
    baseCost:                500000,
    weeklyUpkeepBase:        500,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         1.2,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               1,
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
  },
  {
    slug:                    'scouting_center',
    label:                   'Scouting Center',
    description:             'Talent identification hub that drives scouting intelligence and academy reputation.',
    category:                'SCOUTING',
    baseCost:                1000000,
    weeklyUpkeepBase:        300,
    matchdayIncome:          null,
    matchdayIncomeMultiplier: null,
    reputationBonus:         2.0,
    maxLevel:                5,
    decayBase:               2.0,
    sortOrder:               6,
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
 * Repair cost in whole pounds to restore a facility to 100% condition.
 * Formula: ceil((100 - condition) / 100 × level × (baseCost / 100) × 0.5)
 */
export function repairFacilityCost(
  level: number,
  condition: number,
  baseCostPence: number,
): number {
  if (level === 0 || condition >= 100) return 0;
  return Math.ceil(((100 - condition) / 100) * level * (baseCostPence / 100) * 0.5);
}
