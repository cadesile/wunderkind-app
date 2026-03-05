import { apiRequest } from '@/api/client';
import type { AcademyStatusResponse } from '@/types/api';

/**
 * GET /api/academy/status
 * Returns current academy status. Balance is in pence — use penceToPounds() to convert.
 */
export async function getAcademyStatus(): Promise<AcademyStatusResponse> {
  return apiRequest<AcademyStatusResponse>('/api/academy/status');
}
