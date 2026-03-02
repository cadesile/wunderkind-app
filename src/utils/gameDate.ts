/** Temporal engine — all game-date calculations live here */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

/** Game calendar starts on 1 July 2026 (Week 1) */
export const GAME_START = new Date('2026-07-01');

/** Returns the JS Date for the start of a given game week (1-indexed) */
export function getGameDate(weekNumber: number): Date {
  return new Date(GAME_START.getTime() + (weekNumber - 1) * 7 * MS_PER_DAY);
}

/** Returns a display string like "01 JUL 2026" */
export function getGameDateDisplay(weekNumber: number): string {
  const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const d = getGameDate(weekNumber);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Computes a player's age from their date-of-birth string (YYYY-MM-DD)
 * relative to the current game date.
 * Formula: floor((gameDate - DOB) / 365.25 days)
 */
export function computePlayerAge(dateOfBirth: string, gameDate: Date): number {
  const dob = new Date(dateOfBirth);
  return Math.floor((gameDate.getTime() - dob.getTime()) / MS_PER_YEAR);
}

/**
 * Generates a DOB string (YYYY-MM-DD) for a player of a given age
 * as of the current game date.
 * DOB = currentGameDate − (ageYears × 365.25 days)
 */
export function generateDOB(ageYears: number, gameDate: Date): string {
  const ms = gameDate.getTime() - ageYears * MS_PER_YEAR;
  return new Date(ms).toISOString().split('T')[0];
}
