// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  academyName: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  academyName: string;
}

export interface LoginRequest {
  username: string; // email
  password: string;
}

export interface LoginResponse {
  token: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncRequest {
  weekNumber: number;
  clientTimestamp: string; // ISO 8601
  earningsDelta: number;   // pence/cents, >= 0
  reputationDelta: number; // can be negative
  hallOfFamePoints: number;
  transfers: never[];      // pass [] until transfer syncing is implemented
}

export interface SyncAcceptedResponse {
  accepted: true;
  weekNumber: number;
  syncedAt: string;
  academy: {
    reputation: number;
    totalCareerEarnings: number;
    hallOfFamePoints: number;
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
