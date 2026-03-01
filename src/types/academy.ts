export type ReputationTier = 'Local' | 'Regional' | 'National' | 'Elite';

export interface Academy {
  id: string;
  name: string;
  foundedWeek: number;
  reputation: number; // 0–1000
  reputationTier: ReputationTier;
  totalCareerEarnings: number;
  hallOfFamePoints: number;
  squadSize: number;
  staffCount: number;
}
