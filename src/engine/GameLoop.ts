import { calculateTraitShifts, generateIncidents } from './personality';
import { calculateWeeklyFinances } from './finance';
import { simulationService } from './SimulationService';
import { generateAgentOffer } from './agentOffers';
import { computePlayerDevelopment } from './DevelopmentService';
import { processScoutingTasks, checkGemDiscovery, refreshMarketOffers } from './ScoutingService';
import { processWeeklyMoraleDecay, processOrganicRelationshipGrowth } from './RelationshipService';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLoanStore } from '@/stores/loanStore';
import { useMarketStore } from '@/stores/marketStore';
import { useFinanceStore } from '@/stores/financeStore';
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
  const { players, applyWeeklyPlayerUpdates } = useSquadStore.getState();
  const { academy, addBalance, addEarnings, setReputation, incrementWeek } = useAcademyStore.getState();
  const { addIncident, addMessage, addAgentOffer, expireOldOffers, messages: inboxMessages } = useInboxStore.getState();
  const { coaches } = useCoachStore.getState();
  const { levels } = useFacilityStore.getState();
  const { processWeeklyRepayments, totalWeeklyRepayment } = useLoanStore.getState();
  const { sponsors: allSponsors, investors: allInvestors } = useMarketStore.getState();

  const weekNumber = academy.weekNumber ?? 1;

  // ── 0. Narrative simulation tick ──────────────────────────────────────────────
  // Processes active multi-week effects and potentially fires a story event.
  // Runs before stat changes so any narrative effects can be overridden by the
  // deterministic weekly engine if needed.
  simulationService.processDailyTick();

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

  // Trait shifts are applied later alongside development updates (single set() call).

  // ── 4. Behavioral incidents ───────────────────────────────────────────────────
  const incidents = players.flatMap((p) => generateIncidents(p, weekNumber));
  incidents.forEach(addIncident);

  // Negative behavioral incidents → inbox message
  incidents
    .filter((i) => i.type === 'negative')
    .forEach((incident) => {
      addMessage({
        id: `incident-${incident.id}`,
        type: 'system',
        week: weekNumber,
        subject: 'Behavioral Report',
        body: incident.description,
        isRead: false,
        entityId: incident.playerId,
      });
    });

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

  // Injury summary → single inbox message (if any)
  if (injuredPlayerIds.length > 0) {
    const injuredNames = injuredPlayerIds
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    addMessage({
      id: `injuries-wk${weekNumber}`,
      type: 'system',
      week: weekNumber,
      subject: `Training Injury Report`,
      body: `${injuredNames} picked up knock${injuredPlayerIds.length > 1 ? 's' : ''} in training this week. Monitor their condition carefully.`,
      isRead: false,
    });
  }

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

  // Balance tracks spendable cash (financialSummary.net is in pence; addBalance takes whole pounds)
  addBalance(Math.round(financialSummary.net / 100));

  // HoF tracker: positive sponsor income only
  if (sponsorIncome > 0) {
    addEarnings(sponsorIncome);
  }

  // ── Ledger: record categorised transactions ────────────────────────────────
  const { addTransaction, clearOldTransactions } = useFinanceStore.getState();
  const nextWeek = weekNumber + 1; // transactions belong to the week just processed

  // All amounts stored in whole pounds for consistent ledger display
  const WAGE_LABELS = new Set(['Player wages', 'Coach salaries', 'Staff wages']);
  const wagesPounds = Math.round(
    financialSummary.breakdown
      .filter((item) => WAGE_LABELS.has(item.label))
      .reduce((sum, item) => sum + item.amount, 0) / 100,
  );
  const upkeepPounds = Math.round(
    financialSummary.breakdown
      .filter((item) => !WAGE_LABELS.has(item.label))
      .reduce((sum, item) => sum + item.amount, 0) / 100,
  );
  const reputationIncome = Math.floor(academy.reputation); // 0–100 scale → whole pounds

  if (wagesPounds > 0) {
    addTransaction({ amount: -wagesPounds,    category: 'wages',           description: `Week ${nextWeek} payroll`,              weekNumber: nextWeek });
  }
  if (upkeepPounds > 0) {
    addTransaction({ amount: -upkeepPounds,   category: 'upkeep',          description: `Week ${nextWeek} maintenance & loans`,   weekNumber: nextWeek });
  }
  if (sponsorIncome > 0) {
    addTransaction({ amount: sponsorIncome,   category: 'sponsor_payment', description: `Week ${nextWeek} sponsor income`,         weekNumber: nextWeek });
  }
  if (reputationIncome > 0) {
    addTransaction({ amount: reputationIncome, category: 'earnings',       description: `Week ${nextWeek} reputation income`,     weekNumber: nextWeek });
  }

  clearOldTransactions();

  // ── 6b. Player development + trait shifts — ONE combined set() ──────────────
  // Compute development updates first (pure calculation, no store writes),
  // then apply BOTH trait shifts and attribute gains in a single Zustand set().
  // This prevents multiple rapid squad store updates which break
  // useSyncExternalStore's tearing-prevention consistency check.
  const devUpdates = computePlayerDevelopment(players, coaches, levels, weekNumber);
  applyWeeklyPlayerUpdates(traitShifts, devUpdates);

  // ── 7. Reputation ─────────────────────────────────────────────────────────────
  // Scaled for 0–100: base 0.5 + Media Center level × 1.2 per week
  const reputationDelta = 0.5 + levels.mediaCenter * 1.2;
  setReputation(reputationDelta);

  // ── 8a. Agent offers: expire stale, generate new ──────────────────────────────
  expireOldOffers(weekNumber);
  const { agents: allAgents } = useMarketStore.getState();
  const agentOffer = generateAgentOffer(weekNumber, players, allAgents, academy.reputation);
  if (agentOffer) addAgentOffer(agentOffer);

  // ── 8b. Advance week ─────────────────────────────────────────────────────────
  incrementWeek();

  // ── 9. Week-1 investor offer ──────────────────────────────────────────────────
  // Only fires once: when this is the first week tick, no investor is assigned yet,
  // and no prior investor message exists in the inbox.
  if (weekNumber === 1 && !academy.investorId) {
    const alreadySent = inboxMessages.some((m) => m.type === 'investor');
    if (!alreadySent) {
      // Prefer a SMALL investor from market data; fall back to any investor available.
      const smallInvestors = allInvestors.filter((inv) => inv.equityTaken <= 10);
      const investor = smallInvestors[0] ?? allInvestors[0] ?? null;

      if (investor) {
        addMessage({
          id: `investor-offer-wk1-${investor.id}`,
          type: 'investor',
          week: weekNumber,
          subject: 'Investment Offer',
          body: `${investor.name} is interested in backing your academy. They are offering £100,000 in funding in exchange for a 10% stake in all future player sales. This could give you the working capital to upgrade facilities and sign stronger players — but remember, every transfer fee will be shared.`,
          isRead: false,
          requiresResponse: true,
          entityId: investor.id,
          metadata: {
            investmentAmount: 100_000,  // £100,000 in whole pounds
            equityPct: 10,
            investorName: investor.name,
            investorSize: 'SMALL',
          },
        });
      }
    }
  }

  // ── 10. Scouting progression ──────────────────────────────────────────────────
  processScoutingTasks();
  checkGemDiscovery();
  refreshMarketOffers();

  // ── 11. Relationship & morale ─────────────────────────────────────────────────
  processWeeklyMoraleDecay();
  processOrganicRelationshipGrowth();

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
