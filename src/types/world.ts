import { PersonalityMatrix } from './player';

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
}

/** Staff member as delivered in the world pack */
export interface WorldStaff {
  id: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'head_coach' | 'chairman' | 'scout';
  coachingAbility: number;
  nationality: string;
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

/** Shape of POST /api/initialize response body */
export interface WorldPackResponse {
  worldPack: {
    leagues: Array<WorldLeague & { clubs: WorldClub[] }>;
    ampStarter: {
      players: WorldPlayer[];
      staff: WorldStaff[];
    };
  };
}
