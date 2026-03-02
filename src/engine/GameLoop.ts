import { calculateTraitShifts, generateIncidents } from './personality';
import { calculateWeeklyFinances } from './finance';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { WeeklyTick } from '@/types/game';
import { PersonalityMatrix } from '@/types/player';

const BASE_XP = 10;
const BASE_INJURY_PROB = 0.05; // 5% per player per week

/**
 * Processes one Weekly Tick entirely on-device.
 *
 * XP Formula:   WeeklyXP = BaseXP × (1 + PitchLevel × 0.05) × (1 + TotalCoachInfluence / 100)
 * Injury Formula: InjuryProb = BaseProb × (1 − LabLevel × 0.08)
 * Reputation:   BaseRep (5) + MediaCenterLevel × 12 per week
 *
 * Mutates Zustand stores; returns a WeeklyTick for sync queuing.
 */
export function processWeeklyTick(): WeeklyTick {
  const { players, applyTraitShifts } = useSquadStore.getState();
  const { academy, addEarnings, setReputation, incrementWeek } = useAcademyStore.getState();
  const { addIncident } = useInboxStore.getState();
  const { coaches } = useCoachStore.getState();
  const { levels } = useFacilityStore.getState();

  const weekNumber = academy.weekNumber ?? 1;

  // ── 1. XP Formula ────────────────────────────────────────────────────────────
  // WeeklyXP = BaseXP × (1 + PitchLevel × 0.05) × (1 + TotalCoachInfluence / 100)
  const totalCoachInfluence = coaches.reduce((sum, c) => sum + c.influence, 0);
  const weeklyXP =
    BASE_XP *
    (1 + levels.trainingPitch * 0.05) *
    (1 + totalCoachInfluence / 100);

  // ── 2. Injury Probability ─────────────────────────────────────────────────────
  // InjuryProb = BaseProb × (1 − LabLevel × 0.08)   [floors at 0]
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

  // Injury notifications → inbox
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

  // ── 5. Finances ───────────────────────────────────────────────────────────────
  // Weekly Outgoings = Σ(PlayerWages) + Σ(CoachSalaries) + Σ(FacilityMaintenance)
  const financialSummary = calculateWeeklyFinances(
    weekNumber, academy, players, coaches, levels,
  );
  addEarnings(financialSummary.net);

  // ── 6. Reputation ─────────────────────────────────────────────────────────────
  // Base 5 pts + Media Center level × 12 pts per week
  const BASE_REP_GAIN = 5;
  const reputationDelta = BASE_REP_GAIN + levels.mediaCenter * 12;
  setReputation(reputationDelta);

  // ── 7. Advance week ───────────────────────────────────────────────────────────
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
