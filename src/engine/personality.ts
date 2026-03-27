import { PersonalityMatrix, Player, PlayerAttributes, TraitName } from '@/types/player';
import { BehavioralIncident } from '@/types/game';
import { getRelationshipValue } from '@/engine/RelationshipService';

export const TRAIT_NAMES: TraitName[] = [
  'determination',
  'professionalism',
  'ambition',
  'loyalty',
  'adaptability',
  'pressure',
  'temperament',
  'consistency',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomTrait(): number {
  return 1 + Math.floor(Math.random() * 20);
}

// ─── Personality generation ───────────────────────────────────────────────────

/** Generates all 8 personality traits with random 1–20 values. */
export function generatePersonality(): PersonalityMatrix {
  return {
    determination:   randomTrait(),
    professionalism: randomTrait(),
    ambition:        randomTrait(),
    loyalty:         randomTrait(),
    adaptability:    randomTrait(),
    pressure:        randomTrait(),
    temperament:     randomTrait(),
    consistency:     randomTrait(),
  };
}

// ─── Weekly tick helpers ──────────────────────────────────────────────────────

/** Returns a small random drift (±1–2) for natural weekly trait variance */
function naturalDrift(): number {
  return (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
}

/**
 * Calculates weekly trait shifts for a player.
 * Returns partial PersonalityMatrix with deltas (not absolute values).
 *
 * @param regressionUpperThreshold - traits above this drift down (default 14)
 * @param regressionLowerThreshold - traits below this drift up (default 7)
 */
export function calculateTraitShifts(
  player: Player,
  regressionUpperThreshold: number = 14,
  regressionLowerThreshold: number = 7,
): Partial<PersonalityMatrix> {
  const shifts: Partial<PersonalityMatrix> = {};

  TRAIT_NAMES.forEach((trait) => {
    const current = player.personality[trait];
    const regressionForce =
      current > regressionUpperThreshold ? -1 :
      current < regressionLowerThreshold ? 1 :
      0;
    shifts[trait] = regressionForce + naturalDrift();
  });

  return shifts;
}

/** Generates behavioral incidents based on personality trait thresholds */
export function generateIncidents(
  player: Player,
  week: number,
  squadMates?: Player[],
): BehavioralIncident[] {
  const incidents: BehavioralIncident[] = [];

  if (player.personality.professionalism < 6 && Math.random() < 0.3) {
    incidents.push({
      id: `${player.id}-${week}-professionalism`,
      playerId: player.id,
      week,
      type: 'negative',
      description: `${player.name} arrived late to training.`,
      traitAffected: 'professionalism',
      delta: -1,
    });
  }

  if (player.personality.determination > 15 && Math.random() < 0.25) {
    incidents.push({
      id: `${player.id}-${week}-determination`,
      playerId: player.id,
      week,
      type: 'positive',
      description: `${player.name} stayed behind to work on their weaknesses.`,
      traitAffected: 'consistency',
      delta: 1,
    });
  }

  // Player-on-player altercation (only when squad context is available)
  if (squadMates && squadMates.length > 0 && Math.random() < 0.10) {
    const partner = squadMates[Math.floor(Math.random() * squadMates.length)];
    // Deduplicate: only generate once per pair (lower UUID initiates)
    if (player.id < partner.id) {
      const existingRelationship = getRelationshipValue(player, partner.id);

      let severity: 'minor' | 'serious' = 'minor';
      if (existingRelationship < 0) {
        const avgTemperament =
          (player.personality.temperament + partner.personality.temperament) / 2;
        // temperament is 1–20; higher = more volatile
        const seriousChance = 0.2 + (avgTemperament / 20) * 0.5;
        if (Math.random() < seriousChance) {
          severity = 'serious';
        }
      }

      incidents.push({
        // Colon-delimited so GameLoop can safely extract IDs without UUID ambiguity
        id: `altercation:${player.id}:${partner.id}:${week}`,
        playerId: player.id,
        week,
        type: 'negative',
        description: `${player.name} and ${partner.name} had a heated altercation during training.`,
        traitAffected: 'temperament',
        delta: -1,
        severity,
      });
    }
  }

  return incidents;
}
