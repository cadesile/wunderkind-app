export type FinancialCategory =
  | 'wages'
  | 'transfer_fee'
  | 'investment'
  | 'sponsor_payment'
  | 'facility_upgrade'
  | 'upkeep'
  | 'earnings'
  | 'contract_termination'
  | 'investor_buyout'
  | 'guardian_payment'
  | 'matchday_income';

export const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  wages:                'WAGES',
  transfer_fee:         'TRANSFERS',
  investment:           'INVESTMENT',
  sponsor_payment:      'SPONSORS',
  facility_upgrade:     'FACILITIES',
  upkeep:               'UPKEEP',
  earnings:             'EARNINGS',
  contract_termination: 'TERMINATION',
  investor_buyout:      'BUYOUT',
  guardian_payment:     'GUARDIAN',
  matchday_income:      'MATCHDAY',
};

export interface FinancialTransaction {
  id: string;
  /** Amount in pence. Negative = expense, positive = income. */
  amount: number;
  category: FinancialCategory;
  description: string;
  weekNumber: number;
  timestamp: string; // ISO 8601
}

export interface TransferRecord {
  id: string;
  playerId: string;
  playerName: string;
  destinationClub: string;
  /** Gross transfer fee in pence */
  grossFee: number;
  /** Agent commission in pence */
  agentCommission: number;
  /** Net proceeds (after agent commission) in pence */
  netProceeds: number;
  week: number;
  type: 'sale' | 'loan' | 'free_release' | 'agent_assisted' | 'guardian_withdrawal';
}
