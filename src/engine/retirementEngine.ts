/**
 * Retirement Engine
 *
 * Pure utility for computing per-player retirement decisions.
 * Used by GameLoop (AMP notification) and SeasonTransitionService (actual removal).
 */

/**
 * Returns true if a player of the given age should retire this season.
 *
 * - age < minAge  → false (too young)
 * - age >= maxAge → true  (forced retirement)
 * - minAge ≤ age < maxAge → linear probability:
 *     p = ((age - minAge) / (maxAge - minAge)) × chance
 */
export function shouldRetire(
  age: number,
  minAge: number,
  maxAge: number,
  chance: number,
): boolean {
  if (age < minAge) return false;
  if (age >= maxAge) return true;
  const t = (age - minAge) / (maxAge - minAge);
  return Math.random() < t * chance;
}
