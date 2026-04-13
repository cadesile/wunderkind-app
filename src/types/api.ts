export type { MarketDataResponse } from './market';
import type { FinancialCategory } from './finance';
import type { GameConfig } from './gameConfig';
import type { FacilityTemplate } from './facility';

// ─── Starter Config ───────────────────────────────────────────────────────────

export interface StarterConfig {
  startingBalance: number;       // pence
  starterPlayerCount: number;
  starterCoachCount: number;
  starterScoutCount: number;
  starterSponsorTier: string;    // 'SMALL' | 'MEDIUM' | 'LARGE'
  /** Default academy tier for new academies e.g. 'local' | 'regional' | 'national' | 'elite' */
  starterAcademyTier: string;
}

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

// ─── Guardian (backend shape) ─────────────────────────────────────────────────

export interface ApiGuardian {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female';
  demandLevel: number;
  loyaltyToAcademy: number;
  contactEmail: string | null;
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
  guardians?: ApiGuardian[];
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface StaffResponse {
  coaches: ApiStaffCoach[];
  scouts: ApiStaffScout[];
}

export interface ApiStaffCoach {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  role: 'head_coach' | 'assistant_coach' | 'fitness_coach' | 'analyst';
  coachingAbility: number;
  scoutingRange: number;
  /** Weekly salary in pence */
  weeklySalary: number;
  morale: number;
  specialisms?: Record<string, number>;
  tier?: string;
}

export interface ApiStaffScout {
  id: string;
  /** Full name as a single string */
  name: string;
  dateOfBirth?: string;
  nationality: string;
  /** 0–100 scouting range */
  scoutingRange: number;
  /** Weekly salary in pence */
  weeklySalary: number;
  morale: number;
  specialisms?: Record<string, number>;
  tier?: string;
}

// ─── Facilities ───────────────────────────────────────────────────────────────
// Facility state is client-authoritative. The backend delivers FacilityTemplate
// catalogue entries via the sync response; see SyncAcceptedResponse below.
export type { FacilityTemplate };

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
  refresh_token?: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  token: string;
  refresh_token: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncTransfer {
  playerId: string;
  playerName: string;
  destinationClub: string;
  grossFee: number;        // pence
  agentCommission: number; // pence
  netProceeds: number;     // pence
  type: 'sale' | 'loan' | 'free_release' | 'agent_assisted' | 'guardian_withdrawal';
}

export interface SyncLedgerEntry {
  category: FinancialCategory;
  amount: number;      // pence, negative = expense
  description: string;
}

export interface SyncRequest {
  weekNumber: number;
  clientTimestamp: string;        // ISO 8601

  // ── Financial ──────────────────────────────────────────────────────────────
  /** Net income this week in pence — signed (negative = deficit week) */
  earningsDelta: number;
  /** Current spendable balance in pence */
  balance: number;
  /** Cumulative career earnings in pence */
  totalCareerEarnings: number;

  // ── Reputation ─────────────────────────────────────────────────────────────
  /** Signed reputation change this week */
  reputationDelta: number;
  /** Absolute reputation value (0–100) — authoritative anchor for backend reconciliation */
  reputation: number;

  // ── Academy snapshot ───────────────────────────────────────────────────────
  hallOfFamePoints: number;
  /** Number of active (non-transferred/released) players */
  squadSize: number;
  /** Total hired staff (coaches + scouts) */
  staffCount: number;
  /** Current facility levels (0 = not built, 1–10 = operational) */
  facilityLevels: Record<string, number>;

  // ── Activity ───────────────────────────────────────────────────────────────
  transfers: SyncTransfer[];
  ledger: SyncLedgerEntry[];
}

export interface SyncAcceptedResponse {
  accepted: true;
  weekNumber: number;
  syncedAt: string;
  /** Updated engine constants piggybacked on every sync response */
  gameConfig?: GameConfig;
  /** Active facility templates — replaces local fallback on receipt */
  facilityTemplates?: FacilityTemplate[];
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

/**
 * Scope of the leaderboard query.
 * 'global' — all academies (current default).
 * Extensible: 'friends' | 'season' | 'league' for future social features.
 */
export type LeaderboardScope = 'global';

export interface LeaderboardParams {
  page?: number;       // 1-indexed, defaults to 1
  pageSize?: number;   // defaults to 20
  scope?: LeaderboardScope;
}

export interface LeaderboardEntry {
  rank: number;
  academyName: string;
  /** Absolute reputation value (0–100) — primary sort key */
  reputation: number;
  /** Cumulative career earnings in pence — secondary sort key */
  totalCareerEarnings: number;
  /** Academy's current week number — tertiary tiebreaker (ascending: fewer weeks = faster progression) */
  weekNumber: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  /** Total number of academies matching the query (for client-side page calculation) */
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
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
