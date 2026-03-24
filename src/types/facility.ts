export type FacilityType =
  | 'technicalZone'
  | 'strengthSuite'
  | 'tacticalRoom'
  | 'physioClinic'
  | 'hydroPool'
  | 'scoutingCenter';

/** Maps each facility to its current level (0 = not built, 1–10 = operational) */
export type FacilityLevels = Record<FacilityType, number>;

/** Maps each facility to its current condition (0–100%) */
export type FacilityConditions = Record<FacilityType, number>;

export interface FacilityMeta {
  type: FacilityType;
  label: string;
  description: string;
  benefit: string;
  baseCost: number; // whole pounds per upgrade level
  /**
   * One-time reputation bonus per upgrade level.
   * Higher = more externally visible (e.g. Scouting Center > Hydro Pool).
   */
  reputationBonus: number;
}

/** Static metadata for every facility */
export const FACILITY_DEFS: FacilityMeta[] = [
  {
    type: 'technicalZone',
    label: 'Technical Zone',
    description: 'The heartbeat of your academy. Better facilities mean faster technical improvement.',
    benefit: '+5% XP multiplier per level',
    baseCost: 5000,
    reputationBonus: 1.2,
  },
  {
    type: 'strengthSuite',
    label: 'Strength Suite',
    description: 'Dedicated gym and conditioning equipment for physical development.',
    benefit: '+2% power/stamina XP per level',
    baseCost: 6000,
    reputationBonus: 0.8,
  },
  {
    type: 'tacticalRoom',
    label: 'Tactical Room',
    description: 'Video analysis and tactical boards to sharpen game intelligence.',
    benefit: '+5% coach performance per level',
    baseCost: 7000,
    reputationBonus: 1.0,
  },
  {
    type: 'physioClinic',
    label: 'Physio Clinic',
    description: 'State-of-the-art rehabilitation and injury prevention. Also expands squad capacity.',
    benefit: '-8% injury prob/level · +3 squad capacity/level',
    baseCost: 8000,
    reputationBonus: 1.0,
  },
  {
    type: 'hydroPool',
    label: 'Hydro Pool',
    description: 'Hydrotherapy and recovery suite to get players back on their feet faster.',
    benefit: '-10% injury recovery time per level',
    baseCost: 9000,
    reputationBonus: 0.6,
  },
  {
    type: 'scoutingCenter',
    label: 'Scouting Center',
    description: 'Talent identification hub that drives scouting intelligence and academy reputation.',
    benefit: 'Unlocks scouting · rep bonus on upgrade',
    baseCost: 10000,
    reputationBonus: 2.0,
  },
];

/**
 * Weekly condition decay in % points.
 * Formula: 2 + level → L1=3%, L5=7%, L10=12%
 * Level 0 (unbuilt) → no decay.
 */
export function weeklyDecayRate(level: number): number {
  if (level === 0) return 0;
  return 2 + level;
}

/**
 * Repair cost in whole pounds to restore a facility to 100% condition.
 * Formula: ceil((100 - condition) / 100 × level × baseCost × 0.5)
 */
export function repairFacilityCost(type: FacilityType, level: number, condition: number): number {
  if (level === 0 || condition >= 100) return 0;
  const def = FACILITY_DEFS.find((d) => d.type === type)!;
  return Math.ceil(((100 - condition) / 100) * level * def.baseCost * 0.5);
}
