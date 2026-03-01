import { PersonalityMatrix } from './player';

export interface WeeklyTick {
  week: number;
  processedAt: string; // ISO timestamp
  traitShifts: Record<string, Partial<PersonalityMatrix>>;
  incidents: BehavioralIncident[];
  financialSummary: FinancialRecord;
}

export interface FinancialRecord {
  week: number;
  income: number;
  expenses: number;
  net: number;
  breakdown: ExpenseItem[];
}

export interface ExpenseItem {
  label: string;
  amount: number;
}

export interface BehavioralIncident {
  id: string;
  playerId: string;
  week: number;
  type: 'positive' | 'negative';
  description: string;
  traitAffected: string;
  delta: number;
}
