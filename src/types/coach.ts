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
  /** Game week when this contract expires. Undefined = legacy/no contract. */
  contractEndWeek?: number;
  /** Original duration chosen at signing (52, 104, or 156 weeks). Used for DOF auto-renewal. */
  initialContractWeeks?: number;
  /** 1–2 attribute specialisms this coach develops in players */
  specialisms?: CoachSpecialisms;
  morale?: number;
  relationships?: import('./player').Relationship[];
  /** If true, this staff member (usually manager) handles certain player/guardian events automatically. */
  autoManageEvents?: boolean;
  /** DOF: automatically extend contracts for players who want to renew (loyalty ≥ 10). */
  dofAutoRenewContracts?: boolean;
  /** DOF: automatically assign scouts to unscreened market players. */
  dofAutoAssignScouts?: boolean;
  /** DOF: automatically sign revealed market players when manager assessment is positive. */
  dofAutoSignPlayers?: boolean;
  /** DOF: automatically accept/reject incoming transfer offers based on manager opinion. */
  dofAutoSellPlayers?: boolean;
  /** Facility Manager: automatically repair degraded facilities each week if balance allows. */
  facilityManagerAutoRepair?: boolean;
  /** Club tier this coach belongs to — from backend */
  tier?: ClubTier;
  /** Manager's preferred formation from backend (e.g. '4-4-2'). Only set for role='manager'. */
  preferredFormation?: string;
  /** Manager's preferred playing style from backend. Only set for role='manager'. */
  preferredPlayingStyle?: 'POSSESSION' | 'DIRECT' | 'COUNTER' | 'HIGH_PRESS';
  /** If true, the club's formation is overridden by the manager's preferredFormation. */
  managerDeterminesFormation?: boolean;
  /** If true, the club's playing style is overridden by the manager's preferredPlayingStyle. */
  managerDeterminesPlayingStyle?: boolean;
}
