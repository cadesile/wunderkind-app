import { FinancialRecord, ExpenseItem } from '@/types/game';
import { Club } from '@/types/club';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { FacilityTemplate, FacilityLevels } from '@/types/facility';
import { Sponsor } from '@/types/market';
import { calculateFacilityUpkeep } from '@/utils/facilityUpkeep';

/**
 * Net sale price after deducting agent commission and investor equity.
 * Formula: net = grossFee × (1 − agentComm/100) × (1 − ΣinvestorEquity/100)
 */
export function calculateNetSalePrice(
  grossFee: number,
  agentCommissionRate: number,
  investorEquityPcts: number[],
): number {
  const afterAgent = grossFee * (1 - agentCommissionRate / 100);
  const totalEquity = investorEquityPcts.reduce((sum, pct) => sum + pct, 0);
  return Math.floor(afterAgent * (1 - totalEquity / 100));
}

/**
 * Calculates the weekly financial record.
 *
 * Income = Σ(sponsor.weeklyPayment) + reputation × 100 pence
 * Outgoings = Σ(PlayerWages) + Σ(CoachSalaries) + Σ(FacilityMaintenance) + weeklyLoanRepayment
 * Maintenance = baseCost × 1.5^level per facility (see facilityUpkeep.ts)
 */
export function calculateWeeklyFinances(
  week: number,
  club: Club,
  players: Player[],
  coaches: Coach[],
  facilityLevels: FacilityLevels,
  sponsors: Sponsor[] = [],
  weeklyLoanRepayment: number = 0,
  facilityTemplates: FacilityTemplate[] = [],
  playerWageMultiplier: number = 1.0,
): FinancialRecord {
  const breakdown: ExpenseItem[] = [];

  // Player wages — scaled by admin-configured playerWageMultiplier (floored at 0)
  const playerWageTotal = Math.round(
    players.reduce((sum, p) => sum + (p.wage ?? 0), 0) * Math.max(0, playerWageMultiplier),
  );
  if (playerWageTotal > 0) {
    breakdown.push({ label: 'Player wages', amount: playerWageTotal });
  }

  // Coach salaries
  const coachSalaryTotal = coaches.reduce((sum, c) => sum + c.salary, 0);
  if (coachSalaryTotal > 0) {
    breakdown.push({ label: 'Coach salaries', amount: coachSalaryTotal });
  }

  // Legacy staff wages
  const staffWages = club.staffCount * 500;
  if (staffWages > 0) {
    breakdown.push({ label: 'Staff wages', amount: staffWages });
  }

  // Facility maintenance: exponential scaling (weeklyUpkeepBase × 1.5^level)
  facilityTemplates.forEach((template) => {
    const level = facilityLevels[template.slug] ?? 0;
    if (level > 0) {
      const cost = calculateFacilityUpkeep(template, level);
      breakdown.push({ label: `${template.label} maintenance`, amount: cost });
    }
  });

  // Loan repayments
  if (weeklyLoanRepayment > 0) {
    breakdown.push({ label: 'Loan repayment', amount: weeklyLoanRepayment });
  }

  const expenses = breakdown.reduce((sum, item) => sum + item.amount, 0);

  // Sponsor income
  const sponsorIncome = sponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);

  // Reputation-based passive income
  const reputationIncome = Math.floor(club.reputation * 100);

  const income = sponsorIncome + reputationIncome;
  const net = income - expenses;

  return { week, income, expenses, net, breakdown };
}
