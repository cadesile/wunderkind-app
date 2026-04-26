import type { Player, Position } from '@/types/player';

// ─── Tier mapping ─────────────────────────────────────────────────────────────

/**
 * Converts a WorldClub's numeric league tier (1 = top flight, higher = lower league)
 * to the app's 0–3 scale (local=0, regional=1, national=2, elite=3).
 */
export function worldTierToAppTier(worldTier: number): number {
  if (worldTier <= 2) return 3;
  if (worldTier <= 4) return 2;
  if (worldTier <= 6) return 1;
  return 0;
}

// ─── Transfer value ───────────────────────────────────────────────────────────

const POTENTIAL_MULTIPLIER: Record<number, number> = {
  1: 0.8,
  2: 0.95,
  3: 1.1,
  4: 1.3,
  5: 1.5,
};

function ageFactor(age: number): number {
  if (age <= 17) return 1.4;
  if (age <= 21) return 1.4 - (age - 17) * 0.1; // 1.4 → 1.0
  return Math.max(0.2, 1.0 - (age - 21) * 0.1);  // 1.0 → decays
}

/**
 * Calculate a player's transfer market value in pence.
 * Formula: overallRating × 1000 × ageFactor × potentialMultiplier
 */
export function calculateTransferValue(player: Player): number {
  const age    = player.age ?? 17;
  const potMul = POTENTIAL_MULTIPLIER[player.potential] ?? 1.0;
  return Math.round(player.overallRating * 1000 * ageFactor(age) * potMul);
}

// ─── Formation targets ────────────────────────────────────────────────────────

/**
 * Squad-size targets (min/max players per position) for each supported formation.
 * Position keys use the app's Position type: GK | DEF | MID | FWD
 */
const FORMATION_TARGETS: Record<string, Record<Position, { min: number; max: number }>> = {
  '4-4-2':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 8, max: 12 },  FWD: { min: 4, max: 6  } },
  '4-3-3':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 6, max: 9  },  FWD: { min: 6, max: 9  } },
  '4-2-3-1': { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 6, max: 10 },  FWD: { min: 4, max: 6  } },
  '3-5-2':   { GK: { min: 1, max: 2 }, DEF: { min: 6, max: 9  }, MID: { min: 10, max: 15 }, FWD: { min: 4, max: 6  } },
  '5-3-2':   { GK: { min: 1, max: 2 }, DEF: { min: 10, max: 15 }, MID: { min: 6, max: 9  }, FWD: { min: 4, max: 6  } },
  '4-5-1':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 10, max: 15 }, FWD: { min: 2, max: 4  } },
};

/**
 * Return squad-size targets per position for a given formation string.
 * Falls back to 4-4-2 for unknown formations.
 */
export function getFormationTargets(formation: string): Record<Position, { min: number; max: number }> {
  return FORMATION_TARGETS[formation] ?? FORMATION_TARGETS['4-4-2'];
}
