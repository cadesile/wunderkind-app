import {
  AcademyTier,
  ReputationTier,
  TIER_FACILITY_REQUIREMENTS,
  TIER_ORDER,
} from '@/types/academy';
import { FacilityLevels } from '@/types/facility';

const FACILITY_KEYS: (keyof FacilityLevels)[] = [
  'technicalZone', 'strengthSuite', 'tacticalRoom',
  'physioClinic', 'hydroPool', 'scoutingCenter',
];

/**
 * Returns the highest AcademyTier unlocked by the given facility levels.
 * All 6 facilities must meet the minimum level requirement for each tier.
 */
export function computeFacilityTier(levels: FacilityLevels): AcademyTier {
  const minLevel = Math.min(...FACILITY_KEYS.map((k) => levels[k]));

  if (minLevel >= TIER_FACILITY_REQUIREMENTS.elite)    return 'elite';
  if (minLevel >= TIER_FACILITY_REQUIREMENTS.national) return 'national';
  if (minLevel >= TIER_FACILITY_REQUIREMENTS.regional) return 'regional';
  return 'local';
}

/**
 * Returns the effective tier — the lower of reputation tier and facility tier.
 * This governs player OVR caps and market access.
 */
export function getEffectiveTier(
  reputationTier: ReputationTier,
  facilityLevels: FacilityLevels,
): AcademyTier {
  const repTier = reputationTier.toLowerCase() as AcademyTier;
  const facTier = computeFacilityTier(facilityLevels);
  return TIER_ORDER[repTier] <= TIER_ORDER[facTier] ? repTier : facTier;
}
