export type { MarketDataResponse } from './market';
import type { FinancialCategory } from './finance';

// ─── Academy Status ───────────────────────────────────────────────────────────

export interface AcademyStatusResponse {
  id: string;
  name: string;
  /** Balance in pence */
  balance: number;
  reputation: number;
  weekNumber: number;
  totalCareerEarnings: number;
  hallOfFamePoints: number;
  playerCount: number;
  staffCount: number;
  activeSponsors: number;
  activeInvestors: number;
}

// ─── Squad ────────────────────────────────────────────────────────────────────

export interface SquadResponse {
  players: ApiPlayerDetail[];
}

export interface ApiPlayerDetail {
  id: string;
  firstName: string;
  lastName: string;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
  currentAbility: number;
  potential: number;
  morale: number;
  /** Contract value in pence */
  contractValue: number;
  age: number;
  nationality: string;
  status: 'active' | 'loaned_out' | 'transferred' | 'retired';
  personality: {
    confidence: number;
    maturity: number;
    teamwork: number;
    leadership: number;
    ego: number;
    bravery: number;
    greed: number;
    loyalty: number;
  };
  agent: {
    id: string;
    name: string;
    commissionRate: string;
  } | null;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface StaffResponse {
  staff: ApiStaffMember[];
}

export interface ApiStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: 'head_coach' | 'assistant_coach' | 'scout' | 'fitness_coach' | 'analyst';
  specialty: string | null;
  coachingAbility: number;
  scoutingRange: number;
  morale: number;
  /** Weekly salary in pence */
  weeklySalary: number;
}

// ─── Facilities ───────────────────────────────────────────────────────────────

export interface FacilitiesResponse {
  /** Academy balance in pence */
  balance: number;
  facilities: ApiFacilityData[];
}

export interface ApiFacilityData {
  type: 'training_pitch' | 'medical_centre' | 'medical_network' | 'scouting_network';
  level: number;
  currentEffect: string;
  /** Upgrade cost in pence */
  upgradeCost: number;
  nextLevelEffect: string | null;
  canUpgrade: boolean;
}

export interface FacilityUpgradeResponse {
  success: boolean;
  facility: {
    type: string;
    level: number;
    currentEffect: string;
  };
  /** New balance in pence after upgrade */
  newBalance: number;
  /** Cost paid in pence */
  upgradeCost: number;
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export interface ApiInboxResponse {
  unreadCount: number;
  messages: ApiInboxMessage[];
}

/** Backend inbox message — distinct from the local InboxMessage in inboxStore. */
export interface ApiInboxMessage {
  id: string;
  senderType: 'agent' | 'sponsor' | 'investor' | 'system';
  senderName: string;
  subject: string;
  body: string;
  status: 'unread' | 'read' | 'accepted' | 'rejected';
  offerData: unknown | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  respondedAt: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ManagerProfileInput {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female';
  nationality: string; // e.g. 'English'
}

export interface RegisterRequest {
  email: string;
  password: string;
  manager?: ManagerProfileInput;
}

export interface RegisterResponse {
  id: string;
  email: string;
}

export interface LoginRequest {
  username: string; // email
  password: string;
}

export interface LoginResponse {
  token: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncTransfer {
  playerId: string;
  playerName: string;
  destinationClub: string;
  grossFee: number;        // pence
  agentCommission: number; // pence
  netProceeds: number;     // pence
  type: 'sale' | 'loan' | 'free_release' | 'agent_assisted';
}

export interface SyncLedgerEntry {
  category: FinancialCategory;
  amount: number;      // whole pounds, negative = expense
  description: string;
}

export interface SyncRequest {
  weekNumber: number;
  clientTimestamp: string; // ISO 8601
  earningsDelta: number;   // sponsor income − loan interest this week (pence)
  reputationDelta: number; // can be negative
  hallOfFamePoints: number;
  transfers: SyncTransfer[];
  ledger: SyncLedgerEntry[];
  /** Cumulative manager personality shifts this week — optional, ignored by older backend versions */
  managerShifts?: {
    temperament: number;
    discipline: number;
    ambition: number;
  };
  /** Opaque relationship/morale snapshot — stored by backend as JSON, returned in future syncs */
  playerRelationships?: Record<string, import('./player').Relationship[]>;
  coachRelationships?: Record<string, import('./player').Relationship[]>;
  scoutRelationships?: Record<string, import('./player').Relationship[]>;
  playerMorale?: Record<string, number>;
  coachMorale?: Record<string, number>;
  scoutMorale?: Record<string, number>;
  scoutingTasks?: Record<string, string[]>;
}

export interface SyncAcceptedResponse {
  accepted: true;
  weekNumber: number;
  syncedAt: string;
  academy: {
    reputation: number;
    totalCareerEarnings: number;
    hallOfFamePoints: number;
    /** Academy balance in pence — included when backend supports it */
    balance?: number;
  };
}

export interface SyncRejectedResponse {
  accepted: false;
  reason: 'week_rollback';
  currentWeek: number;
}

export type SyncResponse = SyncAcceptedResponse | SyncRejectedResponse;

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardCategory =
  | 'career_earnings'
  | 'academy_reputation'
  | 'hall_of_fame';

export interface LeaderboardEntry {
  rank: number;
  academyName: string;
  score: number;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
