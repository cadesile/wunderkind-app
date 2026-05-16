import type { ClubCountryCode } from '@/utils/nationality';
import type { Appearance } from '@/types/player';

export interface ManagerProfile {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female';
  nationality: string;
  appearance: Appearance;
}

export type ReputationTier = 'Local' | 'Regional' | 'National' | 'Elite';

/** Lowercase tier identifier used by the backend and on market/squad entities. */
export type ClubTier = 'local' | 'regional' | 'national' | 'elite';

/** Minimum reputation value for each tier — used to seed initial club reputation. */
export const TIER_REPUTATION_BASELINE: Record<ClubTier, number> = {
  local: 0,
  regional: 15,
  national: 40,
  elite: 75,
};

/** Numeric rank for tier comparison — higher = more prestigious. */
export const TIER_ORDER: Record<ClubTier, number> = {
  local: 0,
  regional: 1,
  national: 2,
  elite: 3,
};

/**
 * Maximum overallRating a player can achieve while the club is at this tier.
 * Matches the backend Tier.scoreRange() max values.
 */
export const TIER_OVR_CEILING: Record<ClubTier, number> = {
  local:    14,
  regional: 39,
  national: 74,
  elite:    100,
};

/**
 * Minimum level ALL facilities must reach to unlock each tier.
 * Local → Regional: all ≥ 1
 * Regional → National: all ≥ 2
 * National → Elite: all ≥ 5
 */
export const TIER_FACILITY_REQUIREMENTS: Record<ClubTier, number> = {
  local:    0,
  regional: 1,
  national: 2,
  elite:    5,
};

export interface ManagerPersonality {
  paName: string;
  temperament: number; // 0–100
  discipline: number;  // 0–100
  ambition: number;    // 0–100
}

/** A single active sponsorship contract — source of truth for income + display. */
export interface SponsorContract {
  /** Matches the Sponsor.id from the market data pool. */
  id: string;
  /** Agreed weekly payment in **pence**. */
  weeklyPayment: number;
  /** Game week at which this contract expires (exclusive — tick processes expiry when weekNumber >= endWeek). */
  endWeek: number;
}

export interface TrophyStandingEntry {
  clubId:         string;
  clubName:       string;
  position:       number;
  wins:           number;
  draws:          number;
  losses:         number;
  points:         number;
  goalDifference: number;
}

export interface TrophyRecord {
  type:          'league_title';
  tier:          number;
  leagueName:    string;
  season:        number;
  weekCompleted: number;
  wins:          number;
  draws:         number;
  losses:        number;
  points:        number;
  goalsFor:      number;
  goalsAgainst:  number;
  standings:     TrophyStandingEntry[];
}

export interface ClubPricing {
  /** Matchday ticket price in pence. */
  ticketPrice: number;
  /** Club shirt / merchandise price in pence. */
  shirtPrice: number;
  /** Food & drinks concession price in pence. */
  foodDrinksPrice: number;
}

export interface Club {
  id: string;
  name: string;
  foundedWeek: number;
  weekNumber: number;    // current game week (1-indexed); drives the game calendar
  reputation: number;    // 0–100
  reputationTier: ReputationTier;
  totalCareerEarnings: number;
  hallOfFamePoints: number;
  squadSize: number;
  staffCount: number;
  /** Spendable cash balance (loans/expenses/income tracked separately from career earnings) */
  balance: number;
  /** ISO date string, set once at registration; drives "Days Active" */
  createdAt: string;
  /** IDs of active sponsor contracts from market data */
  sponsorIds: string[];
  /** Active sponsorship contracts — replaces bare sponsorIds for income + display. */
  sponsorContracts: SponsorContract[];
  /** ID of assigned investor, or null */
  investorId: string | null;
  /** Equity % from the accepted investor offer (e.g. 10 = 10%) */
  investorEquityPct: number | null;
  /** Original investment amount in pence from the accepted offer */
  investorInvestmentAmount: number | null;
  /** Club home country — restricts market/scouting at Local reputation tier */
  country: ClubCountryCode | null;
  /**
   * Game week of the last rep-positive event (sign, hire, upgrade, breakthrough, transfer).
   * Used to detect inactivity and trigger passive reputation decay.
   */
  lastRepActivityWeek: number;
  /** Optional stadium name set by AMP in the Office → Club screen. */
  stadiumName: string | null;
  /** Tactical formation selected by AMP — matches backend Formation enum values. */
  formation: '4-4-2' | '4-3-3' | '3-5-2' | '5-4-1' | '4-2-3-1';
  /** Playing style selected by AMP — matches NPC club playingStyle values. */
  playingStyle: 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';
  /** Primary kit colour as a 7-char hex string (e.g. '#E53935'). */
  primaryColor: string;
  /** Secondary kit colour as a 7-char hex string. */
  secondaryColor: string;
  /** Club badge/crest shape selected by the AMP. Defaults to 'shield'. */
  badgeShape?: 'classic' | 'compact' | 'badge' | 'shield' | 'modern';
  trophies: TrophyRecord[];
  /** Matchday and merchandise pricing set by the AMP. */
  pricing?: ClubPricing;
}
