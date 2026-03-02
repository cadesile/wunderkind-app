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
  age: number;
  position: Position;
  nationality: string;
  overallRating: number; // 0–100
  potential: number;     // 1–5 stars
  personality: PersonalityMatrix;
  guardianId: string | null;
  joinedWeek: number;
  isActive: boolean;
}
