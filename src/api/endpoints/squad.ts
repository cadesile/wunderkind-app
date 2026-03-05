import { apiRequest } from '@/api/client';
import type { SquadResponse } from '@/types/api';

/**
 * GET /api/squad
 * Returns the full squad roster from the server.
 * Used for server-side validation / reconciliation; local squadStore is authoritative for gameplay.
 */
export async function getSquad(): Promise<SquadResponse> {
  return apiRequest<SquadResponse>('/api/squad');
}

interface ReleasePlayerResponse {
  success: boolean;
  playerId: string;
  playerName: string;
  message: string;
}

/**
 * POST /api/squad/release/{id}
 * Releases a player from the academy back to the global market pool (sets academy = null).
 * Local state is authoritative; this is best-effort sync with the backend.
 */
export async function releasePlayer(playerId: string): Promise<ReleasePlayerResponse> {
  return apiRequest<ReleasePlayerResponse>(`/api/squad/release/${playerId}`, {
    method: 'POST',
  });
}
