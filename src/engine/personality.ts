import { PersonalityMatrix, Player, TraitName } from '@/types/player';
import { BehavioralIncident } from '@/types/game';

const TRAIT_NAMES: TraitName[] = [
  'determination',
  'creativity',
  'teamwork',
  'discipline',
  'resilience',
  'leadership',
  'coachability',
  'ambition',
];

/** Returns a small random drift (±1–3) for natural weekly trait variance */
function naturalDrift(): number {
  return (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3 + 1);
}

/**
 * Calculates weekly trait shifts for a player.
 * Returns partial PersonalityMatrix with deltas (not absolute values).
 */
export function calculateTraitShifts(player: Player): Partial<PersonalityMatrix> {
  const shifts: Partial<PersonalityMatrix> = {};

  TRAIT_NAMES.forEach((trait) => {
    const current = player.personality[trait];
    // Regression-to-mean: high traits drift down slightly, low traits drift up
    const regressionForce = current > 60 ? -1 : current < 40 ? 1 : 0;
    shifts[trait] = regressionForce + naturalDrift();
  });

  return shifts;
}

/** Generates behavioral incidents based on trait thresholds */
export function generateIncidents(
  player: Player,
  week: number
): BehavioralIncident[] {
  const incidents: BehavioralIncident[] = [];

  if (player.personality.discipline < 30 && Math.random() < 0.3) {
    incidents.push({
      id: `${player.id}-${week}-discipline`,
      playerId: player.id,
      week,
      type: 'negative',
      description: `${player.name} arrived late to training.`,
      traitAffected: 'discipline',
      delta: -2,
    });
  }

  if (player.personality.leadership > 75 && Math.random() < 0.25) {
    incidents.push({
      id: `${player.id}-${week}-leadership`,
      playerId: player.id,
      week,
      type: 'positive',
      description: `${player.name} mentored a younger squad member.`,
      traitAffected: 'teamwork',
      delta: 3,
    });
  }

  return incidents;
}
