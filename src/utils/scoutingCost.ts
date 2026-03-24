/**
 * Calculates the upfront cost of a scouting mission in pence.
 * Cost = 0.1% of academy value (pounds) × number of weeks, converted to pence.
 */
export function calcMissionCost(academyValuePounds: number, weeks: number): number {
  return Math.round(academyValuePounds * 0.001 * weeks * 100);
}
