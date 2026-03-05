import { apiRequest } from '@/api/client';
import { MarketData } from '@/types/market';
import type { CoachRole } from '@/types/coach';

// ─── Entity type sent to POST /api/market/assign ───────────────────────────────

export type MarketEntityType = 'player' | 'coach' | 'scout' | 'sponsor' | 'investor';

// ─── Raw backend shapes (as serialised by Symfony) ────────────────────────────
// Source: frontend-integration.md — GET /api/market/data response

interface RawAgent {
  id: string;
  name: string;
  nationality: string;
  experience: number;
  rating: number;
  commissionRate: string; // e.g. "10.00" — stored as numeric string
  isUniversal: boolean;
}

interface RawPlayer {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;        // YYYY-MM-DD
  nationality: string;
  position: string;           // "GK" | "DEF" | "MID" | "ATT"
  potential: number;
  currentAbility: number;
  contractValue: number;
  recruitmentSource: string;
  agent: RawAgent | null;
}

interface RawCoach {
  id: string;
  firstName: string;
  lastName: string;
  role: string;               // snake_case: "head_coach" | "fitness_coach" etc.
  coachingAbility: number;    // 0–100
  scoutingRange: number;
  weeklySalary: number;
}

interface RawScout {
  id: string;
  name: string;               // full name as a single string
  nationality: string;
  experience: number;
  judgements: unknown[];
}

interface RawSponsor {
  id: string;
  company: string;
  nationality: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  expectedReturnPercentage: number;
}

interface RawInvestor {
  id: string;
  company: string;
  nationality: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  expectedReturnPercentage: number;
}

interface RawMarketData {
  players: RawPlayer[];
  coaches: RawCoach[];
  scouts: RawScout[];
  agents: RawAgent[];
  sponsors: RawSponsor[];
  investors: RawInvestor[];
}

// ─── Backend academy init response ────────────────────────────────────────────

export interface AcademyInitServerResponse {
  id: string;
  name: string;
  starterBundle: Record<string, unknown>;
  players: number;
  staff: number;
}

// ─── Transform helpers ────────────────────────────────────────────────────────

/** Backend uses "ATT" for forwards; app uses "FWD". */
function mapPosition(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  if (pos === 'ATT') return 'FWD';
  if (pos === 'GK' || pos === 'DEF' || pos === 'MID') return pos as 'GK' | 'DEF' | 'MID';
  return 'MID';
}

/** Map backend snake_case role to app CoachRole. */
const COACH_ROLE_MAP: Record<string, CoachRole> = {
  head_coach:       'Head Coach',
  fitness_coach:    'Fitness Coach',
  analyst:          'Tactical Analyst',
  assistant_coach:  'Youth Coach',
  scout:            'Youth Coach',
};
function mapCoachRole(role: string): CoachRole {
  return COACH_ROLE_MAP[role] ?? 'Youth Coach';
}

/** Backend coachingAbility is 0–100; app influence is 1–20. */
function mapInfluence(coachingAbility: number): number {
  return Math.max(1, Math.min(20, Math.round(coachingAbility / 5)));
}

/** Derive scoutingRange from experience level. */
function mapScoutingRange(experience: number): 'local' | 'national' | 'international' {
  if (experience >= 8) return 'international';
  if (experience >= 4) return 'national';
  return 'local';
}

/** Weekly sponsor income in pence, derived from company size. */
function sponsorWeeklyPayment(size: 'SMALL' | 'MEDIUM' | 'LARGE'): number {
  if (size === 'LARGE')  return 500_000;
  if (size === 'MEDIUM') return 150_000;
  return 50_000;
}

/** Sponsor contract length in weeks, derived from company size. */
function sponsorContractWeeks(size: 'SMALL' | 'MEDIUM' | 'LARGE'): number {
  if (size === 'LARGE')  return 52;
  if (size === 'MEDIUM') return 26;
  return 13;
}

/** One-time investment amount in pence, derived from company size. */
function investorAmount(size: 'SMALL' | 'MEDIUM' | 'LARGE'): number {
  if (size === 'LARGE')  return 20_000_000;
  if (size === 'MEDIUM') return 5_000_000;
  return 1_000_000;
}

/** Transform raw backend market data to app-facing MarketData. */
function transformMarketData(raw: RawMarketData): MarketData {
  return {
    players: raw.players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      nationality: p.nationality,
      position: mapPosition(p.position),
      potential: p.potential,
      currentAbility: p.currentAbility,
      personality: null,  // backend does not return personality — generated locally on recruit
      agent: p.agent
        ? {
            id: p.agent.id,
            name: p.agent.name,
            commissionRate: parseFloat(p.agent.commissionRate),
            nationality: p.agent.nationality,
          }
        : null,
    })),

    coaches: raw.coaches.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      nationality: '',                       // not included in backend response
      role: mapCoachRole(c.role),
      influence: mapInfluence(c.coachingAbility),
      salary: c.weeklySalary,
    })),

    scouts: raw.scouts.map((s) => {
      const nameParts = s.name.split(' ');
      const successRate = Math.min(90, 40 + s.experience * 5);
      return {
        id: s.id,
        firstName: nameParts[0] ?? s.name,
        lastName: nameParts.slice(1).join(' '),
        nationality: s.nationality,
        scoutingRange: mapScoutingRange(s.experience),
        successRate,
        salary: successRate * 300,
      };
    }),

    agents: raw.agents.map((a) => ({
      id: a.id,
      name: a.name,
      commissionRate: parseFloat(a.commissionRate),
      nationality: a.nationality,
    })),

    sponsors: raw.sponsors.map((s) => ({
      id: s.id,
      name: s.company,
      companySize: s.size,
      weeklyPayment: sponsorWeeklyPayment(s.size),
      contractWeeks: sponsorContractWeeks(s.size),
    })),

    investors: raw.investors.map((i) => ({
      id: i.id,
      name: i.company,
      equityTaken: i.expectedReturnPercentage,
      investmentAmount: investorAmount(i.size),
    })),
  };
}

// ─── Typed assign request/response ───────────────────────────────────────────

export interface MarketAssignRequest {
  entityType: MarketEntityType;
  entityId: string;
}

export interface MarketAssignResponse {
  success: boolean;
  entityId: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const marketApi = {
  /** GET /api/market/data — full market snapshot, transforms to app types. */
  async getMarketData(): Promise<MarketData> {
    const raw = await apiRequest<RawMarketData>('/api/market/data');
    return transformMarketData(raw);
  },

  /**
   * POST /api/market/assign
   * Notifies the backend that an entity has been recruited to the academy.
   * Fire-and-forget via the sync queue; game state is updated locally first.
   */
  assignEntity(entityType: MarketEntityType, entityId: string): Promise<void> {
    return apiRequest<void>('/api/market/assign', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId }),
    });
  },

  /**
   * POST /api/academy/initialize
   * Registers the academy server-side. The response is academy metadata only —
   * starting balance and sponsor/investor IDs are always derived locally from
   * market data (see useAuthFlow).
   */
  initializeAcademy(academyName: string): Promise<AcademyInitServerResponse> {
    return apiRequest<AcademyInitServerResponse>('/api/academy/initialize', {
      method: 'POST',
      body: JSON.stringify({ academyName }),
    });
  },
};

/**
 * Standalone named export — assign a market entity to the academy.
 * Preferred over `marketApi.assignEntity` for new code (fully typed request/response).
 */
export async function assignMarketEntity(
  request: MarketAssignRequest
): Promise<MarketAssignResponse> {
  return apiRequest<MarketAssignResponse>('/api/market/assign', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
