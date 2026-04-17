import { apiRequest } from '@/api/client';
import type { SquadResponse } from '@/types/api';

/**
 * GET /api/squad
 * Returns all players currently assigned to this club.
 * No filtering — the backend already scoped assignments at initializeClub time.
 * Used for bootstrap and server-side reconciliation; local squadStore is authoritative for gameplay.
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
 * Releases a player from the club back to the global market pool (sets club = null).
 * Local state is authoritative; this is best-effort sync with the backend.
 */
export async function releasePlayer(playerId: string): Promise<ReleasePlayerResponse> {
  return apiRequest<ReleasePlayerResponse>(`/api/squad/release/${playerId}`, {
    method: 'POST',
  });
}
