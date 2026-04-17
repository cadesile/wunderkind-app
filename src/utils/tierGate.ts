import {
  ClubTier,
  ReputationTier,
  TIER_FACILITY_REQUIREMENTS,
  TIER_ORDER,
} from '@/types/club';
import { FacilityLevels } from '@/types/facility';

/**
 * Returns the highest ClubTier unlocked by the given facility levels.
 * All built facilities must meet the minimum level requirement for each tier.
 */
export function computeFacilityTier(levels: FacilityLevels): ClubTier {
  const values = Object.values(levels);
  if (values.length === 0) return 'local';
  const minLevel = Math.min(...values);

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
): ClubTier {
  const repTier = reputationTier.toLowerCase() as ClubTier;
  const facTier = computeFacilityTier(facilityLevels);
  return TIER_ORDER[repTier] <= TIER_ORDER[facTier] ? repTier : facTier;
}
