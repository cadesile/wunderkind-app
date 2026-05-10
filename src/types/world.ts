import { Appearance, PersonalityMatrix, PlayerAppearances } from './player';
import type { StaffRole } from './coach';
import type { TrophyRecord } from './club';

/** Player as delivered in the world pack — full attributes + personality */
export interface WorldPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
  nationality: string;
  dateOfBirth: string; // ISO 8601 e.g. "2001-03-15"
  pace: number;
  technical: number;
  vision: number;
  power: number;
  stamina: number;
  heart: number;
  // Unified personality matrix (1-20 scale)
  personality: PersonalityMatrix;
  /** Deterministic visual appearance generated client-side during initialization */
  appearance?: Appearance;
  /** Match appearance history keyed by season → clubId → appearances array */
  appearances?: PlayerAppearances;
  /** Weekly wage in pence from the backend. Server-authoritative. */
  contractValue?: number;
  /** ID of the NPC club this player belongs to, or null if unassigned. Updated by MarketEngine. */
  npcClubId: string | null;
}

/** Staff member as delivered in the world pack */
export interface WorldStaff {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  coachingAbility: number;
  nationality: string;
  /** Attribute specialisms keyed by name (pace/technical/vision/power/stamina/heart), values 1–100. Backend sends [] when unset. */
  specialisms?: Record<string, number> | [];
  /** Deterministic visual appearance generated client-side during initialization */
  appearance?: Appearance;
}

/** Club-level personality traits */
export interface ClubPersonality {
  playingStyle: 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';
  financialApproach: 'SPECULATIVE' | 'BALANCED' | 'CONSERVATIVE';
  managerTemperament: number;
}

/** A fully-staffed NPC club as delivered in the world pack */
export interface WorldClub {
  id: string;
  name: string;
  tier: number;
  reputation: number;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string | null;
  facilities: Record<string, number>;
  personality: ClubPersonality;
  players: WorldPlayer[];
  staff: WorldStaff[];
  /** Randomly assigned formation, e.g. '4-4-2', '4-3-3'. Assigned at world init. */
  formation: string;
  trophies?: TrophyRecord[];
}

/** Lightweight league metadata stored in worldStore (no club rosters) */
export interface WorldLeague {
  id: string;
  tier: number;
  name: string;
  country: string;
  promotionSpots: number | null;
  reputationTier: string | null;
  clubIds: string[]; // references into clubs Record
}

/** Scout as delivered in the ampStarter pack — uses experience + judgements, not coachingAbility */
export interface WorldScout {
  id: string;
  name: string; // full name (not split into firstName/lastName)
  nationality: string;
  experience: number; // 0–100
  judgements: {
    potential: number;
    technical: number;
    physical: number;
    mental: number;
    personality: number;
  };
}

/**
 * Financial fields present on league objects in both /initialize and /conclude-season responses.
 * All monetary values are in pence.
 */
export interface WorldLeagueFinancials {
  tvDeal: number;
  sponsorPot: number;
  prizeMoney: number;
  leaguePositionPot: number;
  leaguePositionDecreasePercent: number;
}

/** Shape of POST /api/initialize response body */
export interface WorldPackResponse {
  worldPack: {
    leagues: Array<WorldLeague & { clubs: WorldClub[] } & WorldLeagueFinancials>;
    ampStarter: {
      players: WorldPlayer[];
      staff: WorldStaff[];
      scouts?: WorldScout[];
    };
  };
}

// ─── conclude-season league update shapes ────────────────────────────────────

/**
 * Club entry as received inside /api/league/conclude-season leagues array.
 * Tier is implicit from the parent league object.
 * Full roster is held locally and must NOT be replaced.
 */
export interface SeasonUpdateClub {
  clubId: string;
  isAmp: boolean;
  promoted: boolean;
  relegated: boolean;
}

/**
 * League shape as received inside /api/league/conclude-season leagues array.
 * Financial fields are per-league (already the AMP's share).
 * clubs contains only slim identity entries — match against local WorldClub data.
 * fixtures format: outer = matchday (0-indexed), inner = [homeClubId, awayClubId] pairs.
 */
export interface SeasonUpdateLeague {
  id: string;
  tier: number;
  name: string;
  country: string;
  promotionSpots: number | null;
  reputationTier: string | null;
  /** AMP club's share of the league TV rights deal (pence) */
  tvDeal: number;
  /** AMP club's share of the league sponsor pot (pence) */
  sponsorPot: number;
  /** Flat prize money for finishing the season (pence) */
  prizeMoney: number;
  /**
   * Base position prize pot (pence).
   * Per-club value = leaguePositionPot × (1 − leaguePositionDecreasePercent/100 × (pos − 1))
   */
  leaguePositionPot: number;
  /** Integer percentage decrease per position, e.g. 10 = 10% */
  leaguePositionDecreasePercent: number;
  clubs: SeasonUpdateClub[];
  fixtures: [string, string][][];
}
