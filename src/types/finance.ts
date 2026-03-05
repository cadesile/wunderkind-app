export type FinancialCategory =
  | 'wages'
  | 'transfer_fee'
  | 'investment'
  | 'sponsor_payment'
  | 'facility_upgrade'
  | 'upkeep'
  | 'earnings'
  | 'contract_termination';

export const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  wages:                'WAGES',
  transfer_fee:         'TRANSFERS',
  investment:           'INVESTMENT',
  sponsor_payment:      'SPONSORS',
  facility_upgrade:     'FACILITIES',
  upkeep:               'UPKEEP',
  earnings:             'EARNINGS',
  contract_termination: 'TERMINATION',
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
