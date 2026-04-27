import { PersonalityMatrix, Appearance } from './player';
import type { ClubTier } from './club';

export type StaffRole =
  | 'assistant_coach'
  | 'coach'
  | 'scout'
  | 'manager'
  | 'director_of_football'
  | 'facility_manager'
  | 'chairman';

export type CoachSpecialism = 'pace' | 'technical' | 'vision' | 'power' | 'stamina' | 'heart';

/** Specialism strength 1–100 per attribute the coach can develop */
export type CoachSpecialisms = Partial<Record<CoachSpecialism, number>>;

export interface Coach {
  id: string;
  name: string;
  role: StaffRole;
  salary: number;    // weekly, in pence
  influence: number; // 1–20 scale
  age?: number;
  personality: PersonalityMatrix;
  /** Deterministic visual appearance generated from id. Optional for backward compat. */
  appearance?: Appearance;
  nationality: string;
  joinedWeek: number;
  /** 1–2 attribute specialisms this coach develops in players */
  specialisms?: CoachSpecialisms;
  morale?: number;
  relationships?: import('./player').Relationship[];
  /** If true, this staff member (usually manager) handles certain player/guardian events automatically. */
  autoManageEvents?: boolean;
  /** Club tier this coach belongs to — from backend */
  tier?: ClubTier;
}
