import { Position, PersonalityMatrix, PlayerAttributes } from './player';
import { StaffRole, CoachSpecialisms } from './coach';
import type { ClubTier } from './club';

// ─── Transfer types ───────────────────────────────────────────────────────────

export interface TransferOffer {
  id: string;
  playerId: string;
  biddingClubId: string;
  biddingClubName: string;
  /** Numeric league tier from WorldClub.tier (1 = top flight) */
  biddingClubTier: number;
  /** Gross fee in pence */
  fee: number;
  weekGenerated: number;
  /** weekGenerated + 4 */
  expiresWeek: number;
}

// ─── Hired staff types (locally-generated) ────────────────────────────────────

export interface ScoutingMission {
  id: string;
  scoutId: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  targetNationality: string | null;
  weeksTotal: number;
  weeksElapsed: number;
  gemsFound: number;
  costPaid: number;   // pence, deducted upfront
  startWeek: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Agent {
  id: string;
  name: string;
  commissionRate: number; // percentage (e.g. 10 = 10%)
  nationality: string;
}

/** A hired scout on the club's payroll — distinct from MarketScout (backend entity). */
export interface Scout {
  id: string;
  name: string;
  role: StaffRole;
  salary: number;         // weekly, in pence
  scoutingRange: 'local' | 'national' | 'international';
  successRate: number;    // 0–100
  nationality: string;
  joinedWeek?: number;
  appearance?: import('./player').Appearance;
  assignedPlayerIds?: string[];
  morale?: number;
  relationships?: import('./player').Relationship[];
  activeMission?: ScoutingMission;
  /** Club tier this scout belongs to — from backend */
  tier?: ClubTier;
}

export type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface Sponsor {
  id: string;
  name: string;
  companySize: CompanySize;
  weeklyPayment: number;  // pence per week
  contractWeeks: number;
}

export interface Investor {
  id: string;
  name: string;
  equityTaken: number;      // percentage (e.g. 5 = 5%)
  investmentAmount: number; // pence
}

export interface Loan {
  id: string;
  amount: number;
  interestRate: number;       // fixed at 0.046 (4.6%)
  weeklyRepayment: number;
  weeksRemaining: number;
  takenWeek: number;
}

/** @deprecated Use MarketData instead */
export interface MarketDataResponse {
  agents: Agent[];
  scouts: Scout[];
  investors: Investor[];
  sponsors: Sponsor[];
}

// ─── Backend market entity types ──────────────────────────────────────────────

/** A player available in the backend market — uses firstName/lastName and currentAbility. */
export interface MarketPlayer {
  id: string;
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  nationality: string;
  position: Position;
  /** 1–5 stars */
  potential: number;
  /** 0–100 */
  currentAbility: number;
  /**
   * Backend does not include personality data for market players.
   * Null until the player is recruited and a local personality is generated.
   */
  personality: PersonalityMatrix | null;
  /**
   * Individual football attributes from the backend.
   * Present when the backend serializes them (post MarketDataService fix).
   * Undefined for legacy/offline-generated market players.
   */
  attributes?: PlayerAttributes;
  /** Height in cm — from backend when available */
  height?: number;
  /** Weight in kg — from backend when available */
  weight?: number;
  /** Assigned agent, or null if unrepresented */
  agent: Agent | null;
  /** Guardians from backend — present for club-assigned and market players */
  guardians?: import('@/types/api').ApiGuardian[];
  scoutingStatus?: 'hidden' | 'scouting' | 'revealed';
  scoutingProgress?: number;
  marketValue?: number;     // pence = currentAbility * 1000
  currentOffer?: number;    // agent's asking price in pence
  perceivedAbility?: number; // revealed ability with scout error applied
  assignedScoutId?: string;
  /** True for players discovered by a scout mission — protects them from backend market refresh wipes. */
  isLocalGem?: boolean;
  /** Club tier this player belongs to — from backend */
  tier?: ClubTier;
  /** True when this player belongs to an NPC club and requires a transfer fee to sign */
  requiresTransferFee?: boolean;
  /** Transfer fee in pence — set when scout fully reveals an NPC-club player */
  transferFee?: number;
  /** Name of the NPC club this player belongs to */
  npcClubName?: string;
  /** Numeric league tier of the NPC club (1 = top flight) */
  npcClubTier?: number;
}

/** A coach available in the backend market. */
export interface MarketCoach {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  role: StaffRole;
  /** 1–20 */
  influence: number;
  /** Weekly, in pence */
  salary: number;
  /** Attribute training boosts — maps attribute name to strength (0–100) */
  specialisms?: CoachSpecialisms;
  morale?: number;
  /** Club tier this coach belongs to — from backend */
  tier?: ClubTier;
}

/** A scout available in the backend market. */
export interface MarketScout {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  /** YYYY-MM-DD — for age display */
  dateOfBirth?: string;
  nationality: string;
  scoutingRange: 'local' | 'national' | 'international';
  /** 0–100 */
  successRate: number;
  /** Weekly, in pence */
  salary: number;
  /** Club tier this scout belongs to — from backend */
  tier?: ClubTier;
}

export interface ScoutingTask {
  playerId: string;
  scoutId: string;
  startedWeek: number;
  progressWeeks: number;
}

/** Full market data response from GET /api/market/data. */
export interface MarketData {
  players: MarketPlayer[];
  coaches: MarketCoach[];
  scouts: MarketScout[];
  sponsors: Sponsor[];
  investors: Investor[];
  agents: Agent[];
}

/**
 * Response from POST /api/club/initialize.
 * Contains club metadata only — financial setup (starting balance,
 * sponsor/investor IDs) is always derived locally from market data.
 */
export interface ClubInitResponse {
  id: string;
  name: string;
  starterBundle: Record<string, unknown>;
  players: number;
  staff: number;
}
