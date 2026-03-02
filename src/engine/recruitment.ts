import { Player, Position } from '@/types/player';
import { Coach, CoachRole } from '@/types/coach';
import { Scout } from '@/types/market';
import { generatePlayer, generatePersonality, TRAIT_NAMES } from './personality';
import { generateAppearance } from './appearance';
import { uuidv7 } from '@/utils/uuidv7';

const COACH_FIRST_NAMES = [
  'Roberto', 'Anders', 'Philippe', 'Miguel', 'Ian', 'Gregor',
  'Tunde', 'Hans', 'Seun', 'Marcelo', 'Viktor', 'Diego',
];
const COACH_LAST_NAMES = [
  'Reyes', 'Larsson', 'Leblanc', 'Sousa', 'Murray', 'Kane',
  'Adeyemi', 'Vogel', 'Okonkwo', 'Lima', 'Novak', 'Herrera',
];
const COACH_NATIONALITIES = [
  'English', 'Spanish', 'French', 'German', 'Brazilian', 'Portuguese',
  'Nigerian', 'Dutch', 'Argentine', 'Swedish', 'Czech',
];
const COACH_ROLES: CoachRole[] = [
  'Head Coach', 'Fitness Coach', 'Youth Coach', 'GK Coach', 'Tactical Analyst',
];

const SCOUT_FIRST_NAMES = [
  'James', 'Pierre', 'Kofi', 'Hamid', 'Luca', 'Tom', 'Ivan',
  'Sergio', 'Ben', 'Marcus', 'Sven', 'Ali',
];
const SCOUT_LAST_NAMES = [
  'Walker', 'Dubois', 'Mensah', 'Karimi', 'Ferrari', 'Fletcher',
  'Petrov', 'Vargas', 'Osei', 'Reid', 'Bjork', 'Hassan',
];
const SCOUT_NATIONALITIES = [
  'English', 'French', 'Ghanaian', 'Iranian', 'Italian', 'Scottish',
  'Bulgarian', 'Colombian', 'Nigerian', 'Welsh', 'Swedish', 'Algerian',
];
const SCOUTING_RANGES: Scout['scoutingRange'][] = ['local', 'national', 'international'];

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a scouted player prospect.
 * Position is random if not specified.
 */
export function generateProspect(currentGameDate: Date, position?: Position): Player {
  return generatePlayer(position ?? pick(POSITIONS), currentGameDate);
}

/**
 * Generates a coach prospect with a random role, personality, influence, and salary.
 * Influence (1–20) drives the XP multiplier in GameLoop.
 * Salary = influence × 500 pence/week.
 */
export function generateCoachProspect(currentWeek: number): Coach {
  const id = uuidv7(); // generate first — used as appearance seed
  const personality = generatePersonality();
  const influence = 1 + Math.floor(Math.random() * 20); // 1–20
  const age = 28 + Math.floor(Math.random() * 31); // 28–58

  return {
    id,
    name: `${pick(COACH_FIRST_NAMES)} ${pick(COACH_LAST_NAMES)}`,
    role: pick(COACH_ROLES),
    salary: influence * 500,
    influence,
    personality,
    appearance: generateAppearance(id, 'COACH', age, personality),
    nationality: pick(COACH_NATIONALITIES),
    joinedWeek: currentWeek,
  };
}

/** Returns N coach prospects */
export function generateCoachProspects(count: number, currentWeek: number): Coach[] {
  return Array.from({ length: count }, () => generateCoachProspect(currentWeek));
}

/** Returns N player prospects */
export function generatePlayerProspects(count: number, currentGameDate: Date): Player[] {
  return Array.from({ length: count }, () => generateProspect(currentGameDate));
}

/**
 * Generates a scout with random scouting range, success rate, and salary.
 * Salary = successRate × 300 pence/week.
 */
export function generateScout(currentWeek: number): Scout {
  const id = uuidv7(); // generate first — used as appearance seed
  const age = 25 + Math.floor(Math.random() * 25); // 25–49
  const successRate = 40 + Math.floor(Math.random() * 51); // 40–90

  return {
    id,
    name: `${pick(SCOUT_FIRST_NAMES)} ${pick(SCOUT_LAST_NAMES)}`,
    salary: successRate * 300,
    scoutingRange: pick(SCOUTING_RANGES),
    successRate,
    nationality: pick(SCOUT_NATIONALITIES),
    joinedWeek: currentWeek,
    appearance: generateAppearance(id, 'SCOUT', age),
  };
}

/** Returns N scout prospects */
export function generateScoutProspects(count: number, currentWeek: number): Scout[] {
  return Array.from({ length: count }, () => generateScout(currentWeek));
}
