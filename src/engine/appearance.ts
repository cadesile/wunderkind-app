import { Appearance, AppearanceRole, FacialHair, HairStyle, PersonalityMatrix } from '@/types/player';

// ─── Palettes ─────────────────────────────────────────────────────────────────

/** 5-shade skin tone palette (light → dark) */
const SKIN_TONES = [
  '#fddbb4', // very light
  '#e8a87c', // light
  '#c68642', // medium
  '#8d5524', // medium-dark
  '#4a2912', // dark
] as const;

/** Hair color palette */
const HAIR_COLORS = [
  '#f5c842', // blonde
  '#a0522d', // auburn
  '#2c1a0e', // dark brown
  '#1a1a1a', // black
  '#c0392b', // red
  '#8b6914', // dirty blonde
] as const;

const GRAY_HAIR = '#b0b0b0';

/** Vibrant kit trim colors for players */
const PLAYER_TRIMS = [
  '#f5c842', // yellow
  '#e8852a', // orange
  '#3a8fd4', // blue
  '#d94040', // red
  '#2eab5a', // green
  '#9b59b6', // purple
] as const;

/** Muted trim colors for staff */
const STAFF_TRIMS = [
  '#4a5568',
  '#2d3748',
  '#374151',
  '#1e3a5f',
] as const;

// ─── Deterministic PRNG ───────────────────────────────────────────────────────

/**
 * djb2-variant hash: converts a string id to a stable uint32.
 * Same id always produces the same seed.
 */
function hashId(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    // hash * 33 XOR charCode
    hash = ((hash << 5) + hash) ^ id.charCodeAt(i);
    hash = hash >>> 0; // keep as 32-bit unsigned
  }
  return hash >>> 0;
}

/**
 * Seeded LCG (Linear Congruential Generator).
 * Multiplier/increment from Numerical Recipes — good distribution for this use case.
 */
class SeededRng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Deterministically generates an Appearance from a stable entity id.
 * The same (id, role, age) triple always produces the same Appearance.
 * Personality traits, when provided, influence expression.
 */
export function generateAppearance(
  id: string,
  role: AppearanceRole,
  age: number,
  personality?: PersonalityMatrix,
): Appearance {
  const rng = new SeededRng(hashId(id));

  // ── Skin tone ──────────────────────────────────────────────────────────────
  const skinTone = rng.pick(SKIN_TONES);

  // ── Hair style — older staff skews toward buzz/bald ────────────────────────
  const hairStylePool: readonly HairStyle[] =
    age > 45
      ? ['buzz', 'buzz', 'crop', 'bald', 'bald']
      : age > 35
      ? ['buzz', 'crop', 'shaggy', 'afro', 'bald']
      : (['buzz', 'shaggy', 'afro', 'crop', 'bald'] as const);

  const hairStyle = rng.pick(hairStylePool);

  // ── Hair color — older coaches/scouts grey up ──────────────────────────────
  let hairColor: string;
  if (hairStyle === 'bald') {
    hairColor = skinTone; // irrelevant; won't render
  } else if (role === 'COACH' && age > 42 && rng.chance(0.5)) {
    hairColor = GRAY_HAIR;
  } else if (age > 38 && rng.chance(0.3)) {
    hairColor = GRAY_HAIR;
  } else {
    hairColor = rng.pick(HAIR_COLORS);
  }

  // ── Expression mapped from personality, random otherwise ──────────────────
  let expression: AppearanceExpression;
  if (personality) {
    if (personality.temperament > 14) {
      expression = 2; // stern
    } else if (personality.determination > 14) {
      expression = 1; // determined
    } else {
      // Weighted toward neutral: 50% neutral, 25% determined, 25% stern
      expression = rng.pick([0, 0, 1, 2] as const);
    }
  } else {
    expression = rng.pick([0, 0, 1, 2] as const);
  }

  // ── Role-specific accessory ────────────────────────────────────────────────
  let accessory: Appearance['accessory'] = null;

  if (role === 'COACH') {
    if (age > 40 && rng.chance(0.38)) {
      accessory = 'glasses';
    } else if (rng.chance(0.12)) {
      accessory = 'beanie';
    } else if (rng.chance(0.08)) {
      accessory = 'sunglasses';
    } else if (rng.chance(0.22)) {
      accessory = 'whistle';
    }
  } else if (role === 'SCOUT') {
    const roll = rng.next();
    if (roll < 0.25) accessory = 'headset';
    else if (roll < 0.45) accessory = 'glasses';
  } else if (role === 'AGENT') {
    if (rng.chance(0.30)) accessory = 'glasses';
  }
  // PLAYER: no accessory

  // ── Kit trim ───────────────────────────────────────────────────────────────
  const kitTrim =
    role === 'PLAYER' ? rng.pick(PLAYER_TRIMS) : rng.pick(STAFF_TRIMS);

  // ── Facial hair ────────────────────────────────────────────────────────────
  let facialHair: FacialHair = 'none';
  if (role !== 'PLAYER' && age >= 20) {
    if (!rng.chance(0.40)) {
      const pool: FacialHair[] = age > 45
        ? ['stubble', 'stubble', 'beard', 'beard', 'moustache']
        : ['stubble', 'stubble', 'moustache', 'goatee', 'beard'];
      facialHair = rng.pick(pool);
    }
  }

  return { skinTone, hairStyle, hairColor, expression, accessory, kitTrim, facialHair };
}

/** Fallback for existing Appearance data without facialHair field. */
export function getAppearanceFacialHair(appearance: Appearance): FacialHair {
  return appearance.facialHair ?? 'none';
}

