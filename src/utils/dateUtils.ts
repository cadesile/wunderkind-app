/** Pure date utility functions — no store dependencies. */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Returns the date of the first Saturday in June for the given year. */
export function getFirstSaturdayOfJune(year: number): Date {
  const d = new Date(year, 5, 1); // June 1
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7; // 0 if already Saturday
  d.setDate(1 + daysUntilSaturday);
  return d;
}

/** Returns the date of the first Saturday in July for the given year. */
export function getFirstWeekendOfJuly(year: number): Date {
  const d = new Date(year, 6, 1); // July 1
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7;
  d.setDate(1 + daysUntilSaturday);
  return d;
}

/** Returns a new date advanced by the given number of weeks. */
export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * MS_PER_WEEK);
}

/** Returns true if the date falls in June. */
export function isJune(date: Date): boolean {
  return date.getMonth() === 5;
}

/** Given any date, returns the first Saturday of June in the next calendar year. */
export function getNextJuneDate(date: Date): Date {
  return getFirstSaturdayOfJune(date.getFullYear() + 1);
}

/** Formats a date as "DD MMM YYYY", e.g. "06 JUN 2026". */
export function formatGameDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Formats a date as "DD MMM", e.g. "06 JUN". Used in inbox message timestamps. */
export function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]}`;
}

/** Returns true if the ISO game date string falls within June (transfer window). */
export function isTransferWindowOpen(gameDate: string): boolean {
  return new Date(gameDate).getMonth() === 5;
}

/**
 * Returns a formatted string for the next June 1st after the given game date,
 * e.g. "01 JUN 2027". Used in UI to tell the player when the window reopens.
 */
export function getNextTransferWindowDate(gameDate: string): string {
  const d = new Date(gameDate);
  const nextYear = d.getMonth() >= 5 ? d.getFullYear() + 1 : d.getFullYear();
  return `01 JUN ${nextYear}`;
}
