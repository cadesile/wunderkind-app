import { apiRequest } from '@/api/client';
import { MarketPlayer } from '@/types/market';

// ─── Raw backend shape — same as RawPlayer in market.ts ───────────────────────

interface RawProspectPlayer {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;           // "GK" | "DEF" | "MID" | "ATT"
  potential: number;
  currentAbility: number;
  contractValue?: number;
  recruitmentSource?: string;
  agent: {
    id: string;
    name: string;
    commissionRate: string;
    nationality: string;
  } | null;
}

interface RawProspectResponse {
  players: RawProspectPlayer[];
}

// ─── Transform ────────────────────────────────────────────────────────────────

function mapPosition(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  if (pos === 'ATT') return 'FWD';
  if (pos === 'GK' || pos === 'DEF' || pos === 'MID') return pos as 'GK' | 'DEF' | 'MID';
  return 'MID';
}

function transformProspect(p: RawProspectPlayer): MarketPlayer {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    nationality: p.nationality,
    position: mapPosition(p.position),
    potential: p.potential,
    currentAbility: p.currentAbility,
    personality: null,
    agent: p.agent
      ? {
          id: p.agent.id,
          name: p.agent.name,
          commissionRate: parseFloat(p.agent.commissionRate),
          nationality: p.agent.nationality,
        }
      : null,
    scoutingStatus: 'hidden',
    scoutingProgress: 0,
    marketValue: p.currentAbility * 1000,
    currentOffer: p.currentAbility * 1000,
    perceivedAbility: p.currentAbility,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/market/prospects
 * Returns the undiscovered player pool managed by the backend.
 * These players are not on the open market — scouts surface them via checkGemDiscovery().
 */
export async function getProspects(): Promise<MarketPlayer[]> {
  const raw = await apiRequest<RawProspectResponse>('/api/market/prospects');
  return raw.players.map(transformProspect);
}
