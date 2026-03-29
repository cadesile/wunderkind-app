import { apiRequest } from '@/api/client';
import type { StaffResponse } from '@/types/api';

/**
 * GET /api/staff
 * Returns the full coaching staff roster from the server.
 * Used for server-side validation / reconciliation; local coachStore is authoritative for gameplay.
 */
export async function getStaff(tier?: string | null): Promise<StaffResponse> {
  const url = tier ? `/api/staff?tier=${encodeURIComponent(tier)}` : '/api/staff';
  return apiRequest<StaffResponse>(url);
}
