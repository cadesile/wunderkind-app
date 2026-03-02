import { PersonalityMatrix, Player, Position, TraitName } from '@/types/player';
import { BehavioralIncident } from '@/types/game';
import { generateDOB } from '@/utils/gameDate';
import { generateAppearance } from '@/engine/appearance';
import { uuidv7 } from '@/utils/uuidv7';

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

// ─── Name pools ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Marcus', 'Luca', 'Kai', 'Omar', 'Theo', 'Finn', 'Nico', 'Leo',
  'Ethan', 'Javier', 'Rafael', 'Seb', 'Malik', 'Ryo', 'Carlos',
  'Antoine', 'Emil', 'Jake', 'Ivan', 'Luis', 'Dami', 'Yusuf',
  'Matteo', 'Alexis', 'Kwame', 'Tobias', 'Remi', 'Fabio', 'Noa', 'Cian',
];

const LAST_NAMES = [
  'Torres', 'Schmidt', 'Chen', 'Okafor', 'Hansen', 'Silva', 'Muller',
  'Santos', 'Park', 'Fischer', 'Diaz', 'Garcia', 'Bello', 'Rossi',
  'Nakamura', 'Williams', 'Dupont', 'Costa', 'Andersen', 'Mensah',
  'Svensson', 'Afolabi', 'Ferreira', 'Makinen', 'Boateng', 'Ramos',
];

const NATIONALITIES = [
  'English', 'Spanish', 'French', 'German', 'Brazilian', 'Portuguese',
  'Nigerian', 'Ghanaian', 'Japanese', 'South Korean', 'Argentine',
  'Dutch', 'Italian', 'Swedish', 'Danish', 'Irish', 'Ivorian', 'Senegalese',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTrait(): number {
  return 1 + Math.floor(Math.random() * 20);
}

// ─── Player generation ────────────────────────────────────────────────────────

/** Generates all 8 personality traits with random 1–20 values */
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

/**
 * Generates a randomised youth player for the given position and game date.
 * DOB = currentGameDate − (ageYears × 365.25 days)
 * Wage = overallRating × 100 pence/week
 */
export function generatePlayer(position: Position, currentGameDate: Date): Player {
  const id = uuidv7(); // generate first — used as appearance seed
  const personality = generatePersonality();
  const avgTrait = Object.values(personality).reduce((a, b) => a + b, 0) / TRAIT_NAMES.length;
  const ageYears = 15 + Math.floor(Math.random() * 3); // 15–17
  const overallRating = Math.round((avgTrait / 20) * 100);

  return {
    id,
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    dateOfBirth: generateDOB(ageYears, currentGameDate),
    age: ageYears,
    position,
    nationality: pick(NATIONALITIES),
    overallRating,
    potential: 1 + Math.floor(Math.random() * 5), // 1–5 stars
    wage: overallRating * 100,                      // pence/week
    personality,
    appearance: generateAppearance(id, 'PLAYER', ageYears, personality),
    guardianId: null,
    agentId: null,
    joinedWeek: 1,
    isActive: true,
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
 */
export function calculateTraitShifts(player: Player): Partial<PersonalityMatrix> {
  const shifts: Partial<PersonalityMatrix> = {};

  TRAIT_NAMES.forEach((trait) => {
    const current = player.personality[trait];
    // Regression-to-mean on 1–20 scale: >14 drift down, <7 drift up
    const regressionForce = current > 14 ? -1 : current < 7 ? 1 : 0;
    shifts[trait] = regressionForce + naturalDrift();
  });

  return shifts;
}

/** Generates behavioral incidents based on personality trait thresholds */
export function generateIncidents(
  player: Player,
  week: number,
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

  return incidents;
}
