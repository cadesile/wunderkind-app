import { calculateTraitShifts, generateIncidents } from './personality';
import { calculateWeeklyFinances } from './finance';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
import { WeeklyTick } from '@/types/game';
import { PersonalityMatrix } from '@/types/player';

let currentWeek = 1;

/**
 * Processes one Weekly Tick entirely on-device.
 * Mutates Zustand stores and returns a WeeklyTick record for sync queuing.
 */
export function processWeeklyTick(): WeeklyTick {
  const { players, applyTraitShifts } = useSquadStore.getState();
  const { academy, addEarnings } = useAcademyStore.getState();
  const { addIncident } = useInboxStore.getState();

  // 1. Personality shifts
  const traitShifts: Record<string, Partial<PersonalityMatrix>> = {};
  players.forEach((player) => {
    traitShifts[player.id] = calculateTraitShifts(player);
  });
  applyTraitShifts(traitShifts);

  // 2. Behavioral incidents
  const incidents = players.flatMap((player) =>
    generateIncidents(player, currentWeek)
  );
  incidents.forEach(addIncident);

  // 3. Finances
  const financialSummary = calculateWeeklyFinances(currentWeek, academy);
  if (financialSummary.net > 0) {
    addEarnings(financialSummary.net);
  }

  const tick: WeeklyTick = {
    week: currentWeek,
    processedAt: new Date().toISOString(),
    traitShifts,
    incidents,
    financialSummary,
  };

  currentWeek += 1;
  return tick;
}
