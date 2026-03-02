export type TraitName =
  | 'determination'
  | 'professionalism'
  | 'ambition'
  | 'loyalty'
  | 'adaptability'
  | 'pressure'
  | 'temperament'
  | 'consistency';

export type PersonalityMatrix = Record<TraitName, number>; // 1–20 scale

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: string;
  name: string;
  /** YYYY-MM-DD — use computePlayerAge() for live display */
  dateOfBirth: string;
  /** Static age at generation time — fallback for legacy data */
  age: number;
  position: Position;
  nationality: string;
  overallRating: number; // 0–100
  potential: number;     // 1–5 stars
  wage: number;          // weekly, in pence
  personality: PersonalityMatrix;
  guardianId: string | null;
  joinedWeek: number;
  isActive: boolean;
}
