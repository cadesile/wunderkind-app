import { FinancialRecord, ExpenseItem } from '@/types/game';
import { Academy } from '@/types/academy';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { FacilityLevels } from '@/types/facility';
import { Sponsor } from '@/types/market';

const FACILITY_TYPES = [
  'trainingPitch',
  'medicalLab',
  'youthHostel',
  'analyticsSuite',
  'mediaCenter',
] as const;

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
 * Maintenance = FacilityLevel × 500 pence per facility
 */
export function calculateWeeklyFinances(
  week: number,
  academy: Academy,
  players: Player[],
  coaches: Coach[],
  facilityLevels: FacilityLevels,
  sponsors: Sponsor[] = [],
  weeklyLoanRepayment: number = 0,
): FinancialRecord {
  const breakdown: ExpenseItem[] = [];

  // Player wages
  const playerWageTotal = players.reduce((sum, p) => sum + (p.wage ?? 0), 0);
  if (playerWageTotal > 0) {
    breakdown.push({ label: 'Player wages', amount: playerWageTotal });
  }

  // Coach salaries
  const coachSalaryTotal = coaches.reduce((sum, c) => sum + c.salary, 0);
  if (coachSalaryTotal > 0) {
    breakdown.push({ label: 'Coach salaries', amount: coachSalaryTotal });
  }

  // Legacy staff wages
  const staffWages = academy.staffCount * 500;
  if (staffWages > 0) {
    breakdown.push({ label: 'Staff wages', amount: staffWages });
  }

  // Facility maintenance: FacilityLevel × 500 pence per facility
  FACILITY_TYPES.forEach((type) => {
    const level = facilityLevels[type];
    if (level > 0) {
      const cost = level * 500;
      breakdown.push({ label: `${type} maintenance`, amount: cost });
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
  const reputationIncome = Math.floor(academy.reputation * 100);

  const income = sponsorIncome + reputationIncome;
  const net = income - expenses;

  return { week, income, expenses, net, breakdown };
}
