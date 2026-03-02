import { Player, Position } from '@/types/player';
import { Coach, CoachRole } from '@/types/coach';
import { generatePlayer, generatePersonality, TRAIT_NAMES } from './personality';

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
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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
  const personality = generatePersonality();
  const influence = 1 + Math.floor(Math.random() * 20); // 1–20
  const avgTrait = Object.values(personality).reduce((a, b) => a + b, 0) / TRAIT_NAMES.length;

  return {
    id: uuid(),
    name: `${pick(COACH_FIRST_NAMES)} ${pick(COACH_LAST_NAMES)}`,
    role: pick(COACH_ROLES),
    salary: influence * 500,   // better coaches cost more
    influence,
    personality,
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
