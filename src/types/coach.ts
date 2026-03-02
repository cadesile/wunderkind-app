import { PersonalityMatrix } from './player';

export type CoachRole =
  | 'Head Coach'
  | 'Fitness Coach'
  | 'Youth Coach'
  | 'GK Coach'
  | 'Tactical Analyst';

export interface Coach {
  id: string;
  name: string;
  role: CoachRole;
  salary: number;    // weekly, in pence
  influence: number; // 1–20 scale
  personality: PersonalityMatrix;
  nationality: string;
  joinedWeek: number;
}
