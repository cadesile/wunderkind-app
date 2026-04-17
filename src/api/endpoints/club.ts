import { apiRequest } from '@/api/client';
import { ApiError } from '@/types/api';
import type { ClubStatusResponse } from '@/types/api';

/**
 * GET /api/club/status
 * Returns current club status. Balance is in pence — use penceToPounds() to convert.
 */
export async function getClubStatus(): Promise<ClubStatusResponse> {
  return apiRequest<ClubStatusResponse>('/api/club/status');
}

/**
 * GET /api/club/check
 * Lightweight existence check for the current user's club.
 * Returns { exists: true } on success, { exists: false } on HTTP 404.
 * Rethrows network/timeout errors so callers can distinguish transient failures
 * from a definitively deleted club.
 */
export async function checkClub(): Promise<{ exists: boolean }> {
  try {
    await apiRequest<{ exists: boolean; clubId: string }>('/api/club/check');
    return { exists: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { exists: false };
    }
    throw err; // network error / timeout — do NOT clear data
  }
}
