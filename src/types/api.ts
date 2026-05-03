export type { MarketDataResponse } from './market';
import type { FinancialCategory } from './finance';
import type { GameConfig } from './gameConfig';
import type { FacilityTemplate } from './facility';

// ─── Starter Config ───────────────────────────────────────────────────────────

export interface StarterConfig {
  startingBalance: number;       // pence
  starterPlayerCount: number;
  starterManagerCount: number;
  starterCoachCount: number;
  starterScoutCount: number;
  starterDirectorOfFootballCount: number;
  starterFacilityManagerCount: number;
  starterChairmanCount: number;
  starterSponsorTier: string;    // 'SMALL' | 'MEDIUM' | 'LARGE'
  /** Default club tier for new academies e.g. 'local' | 'regional' | 'national' | 'elite' */
  starterClubTier: string;
  /** ClubCountryCode values available in the country picker. Defaults to ['EN'] if absent. */
  enabledCountries?: string[];
  /**
   * Starting facility levels for a new club.
   * Keys are facility slugs (e.g. "training_pitch"), values are the initial level (1+).
   * Slugs absent from the map default to level 0.
   */
  defaultFacilities?: Record<string, number>;
  /** 
   * Global ability ranges per country and league tier.
   * Format: { "EN": { "1": { "min": 75, "max": 100 } } }
   */
  leagueAbilityRanges?: Record<string, Record<number, { min: number; max: number }>>;
}

// ─── Club Status ───────────────────────────────────────────────────────────

export interface ClubStatusResponse {
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
  loyaltyToClub: number;
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
  role: import('./coach').StaffRole;
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
  role: import('./coach').StaffRole;
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

// ─── Competition ─────────────────────────────────────────────────────────────

export interface ClubSnapshot {
  id: string;
  name: string;
  reputation: number;
  tier: number;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string | null;
  facilities: Record<string, number>;
}

export interface LeagueSnapshot {
  id: string;
  tier: number;
  name: string;
  country: string;
  season: number;
  promotionSpots: number | null;
  reputationTier: 'local' | 'regional' | 'national' | 'elite' | null;
  /**
   * Maximum reputation (0–100) a club in this league can attain.
   * Sent by the backend as part of the worldpack league config.
   * null = no cap enforced (e.g. unassigned league or legacy data).
   */
  reputationCap: number | null;
  tvDeal: number | null;
  sponsorPot: number;
  prizeMoney: number | null;
  leaguePositionPot: number | null;
  leaguePositionDecreasePercent: number;
  clubs: ClubSnapshot[];
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
  amount: number;      // pence, negative = expense
  description: string;
}

/** Incoming signing — complements SyncTransfer (outgoing sales) */
export interface SyncSigning {
  playerId:      string;
  playerName:    string;
  position:      'GK' | 'DEF' | 'MID' | 'FWD';
  age:           number;
  overallRating: number;
  /** Transfer fee paid in pence. 0 for free agents. */
  fee:           number;
  /** Source NPC club name. null = free agent or generated prospect. */
  fromClub:      string | null;
}

/** Full result detail for one AMP fixture, sent while synced === false */
export interface SyncMatchResult {
  fixtureId:        string;
  leagueId:         string;
  season:           number;
  round:            number;
  opponentClubId:   string;
  opponentClubName: string;
  homeGoals:        number;
  awayGoals:        number;
  /** true if the AMP club was the home side */
  isHome:           boolean;
  playedAt:         string;  // ISO 8601
}

/** Season-to-date stats for one player */
export interface SyncPlayerStat {
  playerId:      string;
  appearances:   number;
  goals:         number;
  assists:       number;
  /** Mean of all per-match rating values (1–10) for this season */
  averageRating: number;
}

/** Season running totals for the AMP club */
export interface SyncSeasonRecord {
  wins:         number;
  draws:        number;
  losses:       number;
  goalsFor:     number;
  goalsAgainst: number;
  points:       number;
}

/** Server-detected milestone, surfaced as an inbox notification on the client */
export interface SyncAchievement {
  /** Machine-readable type — used for client-side deduplication alongside weekNumber */
  type:        string;
  /** Human-readable message, displayed directly in the inbox */
  description: string;
  weekNumber:  number;
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

  // ── Club snapshot ───────────────────────────────────────────────────────────
  hallOfFamePoints: number;
  /** Number of active (non-transferred/released) players */
  squadSize: number;
  /** Total hired staff (coaches + scouts) */
  staffCount: number;
  /** Current facility levels (0 = not built, 1–10 = operational) */
  facilityLevels: Record<string, number>;
  /** Mean overallRating of all active players at time of sync */
  squadAvgOvr: number;

  // ── Activity ───────────────────────────────────────────────────────────────
  transfers: SyncTransfer[];
  ledger: SyncLedgerEntry[];
  /** Players signed into the squad this week */
  signings: SyncSigning[];

  // ── Season performance ─────────────────────────────────────────────────────
  /** Last ≤5 results newest first. Derived from fixtureStore. */
  form: ('W' | 'D' | 'L')[];
  /** Current league position (1 = top). null if not yet placed. */
  leaguePosition: number | null;
  seasonRecord: SyncSeasonRecord;
  /** Full result detail for every unsynced AMP fixture */
  matchResults: SyncMatchResult[];
  /** Season-to-date stats for every player with ≥1 appearance */
  playerStats: SyncPlayerStat[];
}

export interface SyncAcceptedResponse {
  accepted: true;
  weekNumber: number;
  syncedAt: string;
  /** Updated engine constants piggybacked on every sync response */
  gameConfig?: GameConfig;
  /** Active facility templates — replaces local fallback on receipt */
  facilityTemplates?: FacilityTemplate[];
  club: {
    id: string;                  // club UUID — used as the AMP's club ID in fixtures
    reputation: number;
    totalCareerEarnings: number;
    hallOfFamePoints: number;
    /** Club balance in pence — included when backend supports it */
    balance?: number;
  };
  /** League the club is currently assigned to. null = not yet assigned or no match found. */
  league: LeagueSnapshot | null;
  /**
   * Fixture IDs the backend successfully recorded from matchResults.
   * Client calls fixtureStore.markSynced(syncedFixtureIds) on receipt.
   * Absent = client leaves all fixture sync flags unchanged.
   */
  syncedFixtureIds?: string[];
  /**
   * Server-detected milestones fired this week.
   * Client surfaces each as a system inbox message, deduplicated by type + weekNumber.
   * Absent or empty = no achievements this week.
   */
  achievements?: SyncAchievement[];
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
  | 'club_reputation'
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
  clubName: string;
  /** Absolute reputation value (0–100) — primary sort key */
  reputation: number;
  /** Cumulative career earnings in pence — secondary sort key */
  totalCareerEarnings: number;
  /** Club's current week number — tertiary tiebreaker (ascending: fewer weeks = faster progression) */
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
