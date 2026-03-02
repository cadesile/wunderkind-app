import { Appearance } from './player';

export interface Agent {
  id: string;
  name: string;
  commissionRate: number; // percentage (e.g. 10 = 10%)
  nationality: string;
}

export interface Scout {
  id: string;
  name: string;
  salary: number;         // weekly, in pence
  scoutingRange: 'local' | 'national' | 'international';
  successRate: number;    // 0–100
  nationality: string;
  joinedWeek?: number;
  appearance?: Appearance;
}

export type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface Sponsor {
  id: string;
  name: string;
  companySize: CompanySize;
  weeklyPayment: number;  // pence per week
  contractWeeks: number;
}

export interface Investor {
  id: string;
  name: string;
  equityTaken: number;      // percentage (e.g. 5 = 5%)
  investmentAmount: number; // pence
}

export interface Loan {
  id: string;
  amount: number;
  interestRate: number;       // fixed at 0.046 (4.6%)
  weeklyRepayment: number;
  weeksRemaining: number;
  takenWeek: number;
}

export interface MarketDataResponse {
  agents: Agent[];
  scouts: Scout[];
  investors: Investor[];
  sponsors: Sponsor[];
}
