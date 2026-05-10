import { FinancialRecord, ExpenseItem } from '@/types/game';
import { Club } from '@/types/club';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { FacilityTemplate, FacilityLevels } from '@/types/facility';
import { Sponsor } from '@/types/market';
import { calculateFacilityUpkeep } from '@/utils/facilityUpkeep';
import { WageMultiplierTier, resolveWageTier } from '@/types/gameConfig';

/**
 * Calculates the total cost (in pence) to extend a player's contract.
 *
 * Formula:
 *   weeklyWage (pence) = ability × randBetween(randMin, randMax) × playerMultiplier
 *   extensionCost      = weeklyWage × contractLengthWeeks
 *
 * The random coefficient is re-rolled each time so the cost is always
 * freshly computed from the player's current ability — old contractValue
 * is not inherited.
 */
/** Weekly wage in pence for a player at the given ability, rolled fresh each call. */
export function calculateWeeklyWage(
  ability: number,
  tiers: WageMultiplierTier[],
  randMin: number,
  randMax: number,
): number {
  const tier = resolveWageTier(tiers, ability);
  const randCoeff = randMin + Math.floor(Math.random() * (randMax - randMin + 1));
  return Math.round(ability * randCoeff * tier.playerMultiplier);
}

/**
 * Total cost (pence) to extend a contract for contractLengthWeeks.
 * Rolls a fresh wage — does not inherit the player's old contractValue.
 */
export function calculateExtensionCost(
  ability: number,
  contractLengthWeeks: number,
  tiers: WageMultiplierTier[],
  randMin: number,
  randMax: number,
): number {
  return calculateWeeklyWage(ability, tiers, randMin, randMax) * contractLengthWeeks;
}

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

  // Reputation-based passive income is disabled
  const income = sponsorIncome;
  const net = income - expenses;

  return { week, income, expenses, net, breakdown };
}
