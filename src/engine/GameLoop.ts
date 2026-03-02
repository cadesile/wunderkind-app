import { calculateTraitShifts, generateIncidents } from './personality';
import { calculateWeeklyFinances } from './finance';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLoanStore } from '@/stores/loanStore';
import { useMarketStore } from '@/stores/marketStore';
import { WeeklyTick } from '@/types/game';
import { PersonalityMatrix } from '@/types/player';

const BASE_XP = 10;
const BASE_INJURY_PROB = 0.05; // 5% per player per week

/**
 * Processes one Weekly Tick entirely on-device.
 *
 * XP Formula:   WeeklyXP = BaseXP × (1 + PitchLevel × 0.05) × (1 + TotalCoachInfluence / 100)
 * Injury Formula: InjuryProb = BaseProb × (1 − LabLevel × 0.08)
 * Reputation:   0.5 + mediaCenterLevel × 1.2 per week (0–100 scale)
 *
 * Mutates Zustand stores; returns a WeeklyTick for sync queuing.
 */
export function processWeeklyTick(): WeeklyTick {
  const { players, applyTraitShifts } = useSquadStore.getState();
  const { academy, addBalance, addEarnings, setReputation, incrementWeek } = useAcademyStore.getState();
  const { addIncident } = useInboxStore.getState();
  const { coaches } = useCoachStore.getState();
  const { levels } = useFacilityStore.getState();
  const { processWeeklyRepayments, totalWeeklyRepayment } = useLoanStore.getState();
  const { sponsors: allSponsors } = useMarketStore.getState();

  const weekNumber = academy.weekNumber ?? 1;

  // ── 1. XP Formula ────────────────────────────────────────────────────────────
  const totalCoachInfluence = coaches.reduce((sum, c) => sum + c.influence, 0);
  const weeklyXP =
    BASE_XP *
    (1 + levels.trainingPitch * 0.05) *
    (1 + totalCoachInfluence / 100);

  // ── 2. Injury Probability ─────────────────────────────────────────────────────
  const injuryProb = Math.max(0, BASE_INJURY_PROB * (1 - levels.medicalLab * 0.08));

  // ── 3. Personality shifts ─────────────────────────────────────────────────────
  const traitShifts: Record<string, Partial<PersonalityMatrix>> = {};
  const injuredPlayerIds: string[] = [];

  players.forEach((player) => {
    traitShifts[player.id] = calculateTraitShifts(player);
    if (Math.random() < injuryProb) {
      injuredPlayerIds.push(player.id);
    }
  });
  applyTraitShifts(traitShifts);

  // ── 4. Behavioral incidents ───────────────────────────────────────────────────
  const incidents = players.flatMap((p) => generateIncidents(p, weekNumber));
  incidents.forEach(addIncident);

  injuredPlayerIds.forEach((id) => {
    const player = players.find((p) => p.id === id);
    if (player) {
      addIncident({
        id: `${id}-${weekNumber}-injury`,
        playerId: id,
        week: weekNumber,
        type: 'negative',
        description: `${player.name} picked up a knock in training this week.`,
        traitAffected: 'consistency',
        delta: -1,
      });
    }
  });

  // ── 5. Loan repayments ────────────────────────────────────────────────────────
  const weeklyLoanRepayment = totalWeeklyRepayment();
  processWeeklyRepayments();

  // ── 6. Finances ───────────────────────────────────────────────────────────────
  // Resolve this academy's active sponsors from market data
  const activeSponsors = allSponsors.filter((s) =>
    academy.sponsorIds.includes(s.id)
  );
  const sponsorIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);

  const financialSummary = calculateWeeklyFinances(
    weekNumber, academy, players, coaches, levels, activeSponsors, weeklyLoanRepayment,
  );

  // Balance tracks spendable cash
  addBalance(financialSummary.net);

  // HoF tracker: positive sponsor income only
  if (sponsorIncome > 0) {
    addEarnings(sponsorIncome);
  }

  // ── 7. Reputation ─────────────────────────────────────────────────────────────
  // Scaled for 0–100: base 0.5 + Media Center level × 1.2 per week
  const reputationDelta = 0.5 + levels.mediaCenter * 1.2;
  setReputation(reputationDelta);

  // ── 8. Advance week ───────────────────────────────────────────────────────────
  incrementWeek();

  return {
    week: weekNumber,
    processedAt: new Date().toISOString(),
    traitShifts,
    incidents,
    financialSummary,
    weeklyXP,
    reputationDelta,
    injuredPlayerIds,
  };
}
