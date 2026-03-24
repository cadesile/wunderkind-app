import { apiRequest } from '@/api/client';
import { ApiError } from '@/types/api';
import type { AcademyStatusResponse } from '@/types/api';

/**
 * GET /api/academy/status
 * Returns current academy status. Balance is in pence — use penceToPounds() to convert.
 */
export async function getAcademyStatus(): Promise<AcademyStatusResponse> {
  return apiRequest<AcademyStatusResponse>('/api/academy/status');
}

/**
 * GET /api/academy/check
 * Lightweight existence check for the current user's academy.
 * Returns { exists: true } on success, { exists: false } on HTTP 404.
 * Rethrows network/timeout errors so callers can distinguish transient failures
 * from a definitively deleted academy.
 */
export async function checkAcademy(): Promise<{ exists: boolean }> {
  try {
    await apiRequest<{ exists: boolean; academyId: string }>('/api/academy/check');
    return { exists: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { exists: false };
    }
    throw err; // network error / timeout — do NOT clear data
  }
}
