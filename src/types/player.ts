export type TraitName =
  | 'determination'
  | 'creativity'
  | 'teamwork'
  | 'discipline'
  | 'resilience'
  | 'leadership'
  | 'coachability'
  | 'ambition';

export type PersonalityMatrix = Record<TraitName, number>; // 0–100

export interface Player {
  id: string;
  name: string;
  age: number;
  position: string;
  nationality: string;
  overallRating: number;
  personality: PersonalityMatrix;
  guardianId: string | null;
  joinedWeek: number;
  isActive: boolean;
}
