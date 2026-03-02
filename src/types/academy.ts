export type ReputationTier = 'Local' | 'Regional' | 'National' | 'Elite';

export interface Academy {
  id: string;
  name: string;
  foundedWeek: number;
  weekNumber: number;    // current game week (1-indexed); drives the game calendar
  reputation: number;    // 0–100
  reputationTier: ReputationTier;
  totalCareerEarnings: number;
  hallOfFamePoints: number;
  squadSize: number;
  staffCount: number;
  /** Spendable cash balance (loans/expenses/income tracked separately from career earnings) */
  balance: number;
  /** ISO date string, set once at registration; drives "Days Active" */
  createdAt: string;
  /** IDs of active sponsor contracts from market data */
  sponsorIds: string[];
  /** ID of assigned investor, or null */
  investorId: string | null;
}
