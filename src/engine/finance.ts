import { FinancialRecord, ExpenseItem } from '@/types/game';
import { Academy } from '@/types/academy';

const WEEKLY_STAFF_COST = 500;
const WEEKLY_FACILITY_COST = 250;
const REPUTATION_INCOME_MULTIPLIER = 10;

/** Calculates the financial record for a given week */
export function calculateWeeklyFinances(
  week: number,
  academy: Academy
): FinancialRecord {
  const breakdown: ExpenseItem[] = [
    { label: 'Staff wages', amount: academy.staffCount * WEEKLY_STAFF_COST },
    { label: 'Facility upkeep', amount: WEEKLY_FACILITY_COST },
  ];

  const expenses = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const income = Math.floor(academy.reputation * REPUTATION_INCOME_MULTIPLIER);
  const net = income - expenses;

  return { week, income, expenses, net, breakdown };
}
