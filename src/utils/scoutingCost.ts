/**
 * Calculates the upfront cost of a scouting mission in pence.
 * Cost = 0.1% of club value (pounds) × number of weeks, converted to pence.
 */
export function calcMissionCost(clubValuePounds: number, weeks: number): number {
  return Math.round(clubValuePounds * 0.001 * weeks * 100);
}
