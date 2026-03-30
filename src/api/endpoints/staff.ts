import { apiRequest } from '@/api/client';
import type { StaffResponse } from '@/types/api';

/**
 * GET /api/staff
 * Returns all staff currently assigned to this academy.
 * No filtering — the backend already scoped assignments at initializeAcademy time.
 * Used for bootstrap and server-side reconciliation; local coachStore is authoritative for gameplay.
 */
export async function getStaff(): Promise<StaffResponse> {
  return apiRequest<StaffResponse>('/api/staff');
}
