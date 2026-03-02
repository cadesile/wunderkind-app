export type ReputationTier = 'Local' | 'Regional' | 'National' | 'Elite';

export interface Academy {
  id: string;
  name: string;
  foundedWeek: number;
  weekNumber: number;    // current game week (1-indexed); drives the game calendar
  reputation: number;    // 0–1000
  reputationTier: ReputationTier;
  totalCareerEarnings: number;
  hallOfFamePoints: number;
  squadSize: number;
  staffCount: number;
}
