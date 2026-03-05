import { apiRequest } from '@/api/client';
import type { FacilitiesResponse, FacilityUpgradeResponse } from '@/types/api';

/**
 * GET /api/facilities
 * Returns all facilities with current levels and upgrade costs.
 * Balance and upgradeCost are in pence.
 */
export async function getFacilities(): Promise<FacilitiesResponse> {
  return apiRequest<FacilitiesResponse>('/api/facilities');
}

/**
 * POST /api/facilities/:facilityType/upgrade
 * Upgrades a facility on the server.
 * @param facilityType — One of: training_pitch, medical_centre, medical_network, scouting_network
 *
 * Returns newBalance in pence. On error the server returns:
 *   400: Insufficient funds
 *   409: Already at max level
 */
export async function upgradeFacility(facilityType: string): Promise<FacilityUpgradeResponse> {
  return apiRequest<FacilityUpgradeResponse>(`/api/facilities/${facilityType}/upgrade`, {
    method: 'POST',
  });
}
