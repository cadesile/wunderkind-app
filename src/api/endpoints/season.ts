import { apiRequest } from '@/api/client';
import type { SeasonUpdateLeague } from '@/types/world';

export interface PyramidStanding {
  clubId: string;
  isAmp: boolean;
  promoted: boolean;
  relegated: boolean;
}

export interface PyramidLeague {
  leagueId: string;
  standings: PyramidStanding[];
}

export interface ConcludeSeasonPayload {
  finalPosition: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  promoted: boolean;
  relegated: boolean;
  pyramidSnapshot: {
    leagues: PyramidLeague[];
  };
}

export interface ConcludeSeasonResponse {
  seasonRecordId: string;
  /** Non-null when the club has been promoted or relegated; null = same league. */
  newLeague: { id: string; tier: number; name: string } | null;
  /**
   * Full refreshed league list for all tiers.
   * Financial fields (tvDeal, sponsorPot, etc.) are on each league entry.
   * clubs[] entries are slim (id/name/tier only) — local NPC rosters must NOT be replaced.
   * The AMP club's UUID appears directly in fixtures[] for its assigned tier.
   */
  leagues: SeasonUpdateLeague[];
}

export async function concludeSeason(
  payload: ConcludeSeasonPayload,
): Promise<ConcludeSeasonResponse> {
  return apiRequest<ConcludeSeasonResponse>('/api/league/conclude-season', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
