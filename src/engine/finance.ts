import { FinancialRecord, ExpenseItem } from '@/types/game';
import { Academy } from '@/types/academy';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { FacilityLevels } from '@/types/facility';

const FACILITY_TYPES = [
  'trainingPitch',
  'medicalLab',
  'youthHostel',
  'analyticsSuite',
  'mediaCenter',
] as const;

/**
 * Calculates the weekly financial record.
 *
 * Outgoings = Σ(PlayerWages) + Σ(CoachSalaries) + Σ(FacilityMaintenance)
 * Maintenance = FacilityLevel × 500 pence per facility
 * Income = reputation × 10 + (mediaCenterLevel × 12 × 10)  [reputation points → pence]
 */
export function calculateWeeklyFinances(
  week: number,
  academy: Academy,
  players: Player[],
  coaches: Coach[],
  facilityLevels: FacilityLevels,
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

  const expenses = breakdown.reduce((sum, item) => sum + item.amount, 0);

  // Income: reputation-based + media center passive bonus feeds reputation,
  // modelled here as a passive income equivalent
  const income = Math.floor(academy.reputation * 10);

  const net = income - expenses;

  return { week, income, expenses, net, breakdown };
}
