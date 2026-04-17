import { PersonalityMatrix, Appearance } from './player';
import type { ClubTier } from './club';

export type CoachRole =
  | 'Head Coach'
  | 'Fitness Coach'
  | 'Youth Coach'
  | 'GK Coach'
  | 'Tactical Analyst';

export type CoachSpecialism = 'pace' | 'technical' | 'vision' | 'power' | 'stamina' | 'heart';

/** Specialism strength 1–100 per attribute the coach can develop */
export type CoachSpecialisms = Partial<Record<CoachSpecialism, number>>;

export interface Coach {
  id: string;
  name: string;
  role: CoachRole;
  salary: number;    // weekly, in pence
  influence: number; // 1–20 scale
  personality: PersonalityMatrix;
  /** Deterministic visual appearance generated from id. Optional for backward compat. */
  appearance?: Appearance;
  nationality: string;
  joinedWeek: number;
  /** 1–2 attribute specialisms this coach develops in players */
  specialisms?: CoachSpecialisms;
  morale?: number;
  relationships?: import('./player').Relationship[];
  /** Club tier this coach belongs to — from backend */
  tier?: ClubTier;
}
