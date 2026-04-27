import { PersonalityMatrix, Player, PlayerAttributes, TraitName } from '@/types/player';
import { GameConfig, DEFAULT_GAME_CONFIG } from '@/types/gameConfig';

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

