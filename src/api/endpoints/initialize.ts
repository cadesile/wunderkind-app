import { apiRequest } from '@/api/client';
import type { WorldClub, WorldPlayer, WorldStaff, WorldScout } from '@/types/world';

// ─── Step 1: Starter Pack ─────────────────────────────────────────────────────

export interface InitStarterResponse {
  ampStarter: {
    players: WorldPlayer[];
    staff:   WorldStaff[];
    scouts?: WorldScout[];
  };
}

/**
 * POST /api/initialize/starter[?country=XX]
 * Returns the AMP's starter squad, coaching staff, and scouts.
 * Pass country if it is not yet set on the club server-side.
 * Throws ApiError — caller must handle 409 (already done), 412 (pool too small), 422 (no country).
 */
export function postInitializeStarter(country?: string | null): Promise<InitStarterResponse> {
  const qs = country ? `?country=${encodeURIComponent(country)}` : '';
  return apiRequest<InitStarterResponse>(`/api/initialize/starter${qs}`, { method: 'POST' }, false, 60_000);
}

// ─── Step 2: League Metadata ──────────────────────────────────────────────────

export interface InitLeague {
  id:             string;
  tier:           number;
  name:           string;
  country:        string;
  promotionSpots: number | null;
  reputationTier: string | null;
  tvDeal:         number;
  prizeMoney:     number;
  leaguePositionPot: number;
}

export interface InitLeaguesResponse {
  leagues: InitLeague[];
}

/**
 * GET /api/initialize/leagues
 * Returns the full ordered list of league tiers for the club's country.
 * Throws ApiError — caller must handle 412 (starter not done → restart step 1).
 */
export function getInitializeLeagues(): Promise<InitLeaguesResponse> {
  return apiRequest<InitLeaguesResponse>('/api/initialize/leagues', { method: 'GET' }, false, 30_000);
}

// ─── Step 3: Per-Tier NPC Data ────────────────────────────────────────────────

export interface InitLeagueTierResponse {
  tier: number;
  data: {
    clubs:    WorldClub[];
    fixtures: unknown; // delivered by backend, not consumed client-side (generated locally)
  };
}

/**
 * POST /api/initialize/league/{tier}
 * Idempotent — server returns cached payload on repeat calls.
 * Throws ApiError — caller must handle 412 (starter not done → restart step 1), 404 (skip).
 */
export function postInitializeLeagueTier(tier: number): Promise<InitLeagueTierResponse> {
  return apiRequest<InitLeagueTierResponse>(`/api/initialize/league/${tier}`, { method: 'POST' }, false, 60_000);
}
