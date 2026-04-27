import { PersonalityMatrix } from './player';

export interface WeeklyTick {
  week: number;
  processedAt: string; // ISO timestamp
  traitShifts: Record<string, Partial<PersonalityMatrix>>;
  incidents: BehavioralIncident[];
  financialSummary: FinancialRecord;
  weeklyXP: number;
  reputationDelta: number;
  injuredPlayerIds: string[];
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
  severity?: 'minor' | 'serious';
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-4-1' | '4-2-3-1' | '5-3-2' | '4-5-1';
