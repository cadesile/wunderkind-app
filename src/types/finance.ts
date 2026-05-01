export type FinancialCategory =
  | 'wages'
  | 'transfer_fee'
  | 'staff_signing'
  | 'investment'
  | 'sponsor_payment'
  | 'league_sponsor'
  | 'tv_deal'
  | 'facility_upgrade'
  | 'upkeep'
  | 'earnings'
  | 'contract_termination'
  | 'investor_buyout'
  | 'guardian_payment'
  | 'matchday_income'
  | 'loan_repayment';

export const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  wages:                'WAGES',
  transfer_fee:         'TRANSFERS',
  staff_signing:        'STAFF SIGNING',
  investment:           'INVESTMENT',
  sponsor_payment:      'SPONSORS',
  league_sponsor:       'LEAGUE SPONSOR',
  tv_deal:              'TV DEAL',
  facility_upgrade:     'FACILITIES',
  upkeep:               'UPKEEP',
  earnings:             'EARNINGS',
  contract_termination: 'TERMINATION',
  investor_buyout:      'BUYOUT',
  guardian_payment:     'GUARDIAN',
  matchday_income:      'MATCHDAY',
  loan_repayment:       'LOAN',
};

export interface FinancialTransaction {
  id: string;
  /** Amount in whole pounds. Negative = expense, positive = income. */
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
  type: 'sale' | 'loan' | 'free_release' | 'agent_assisted';
}
