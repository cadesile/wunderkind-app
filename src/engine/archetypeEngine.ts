import { Player } from '@/types/player';
import { PlayerArchetype, ArchetypeMatch } from '@/types/archetype';

/**
 * Calculate weighted score for a player against an archetype's formula.
 * Trait values are on the 1–20 scale; weights are 0–1.
 */
function calculateArchetypeScore(player: Player, archetype: PlayerArchetype): number {
  const { formula } = archetype.traitMapping;
  let weightedSum = 0;

  for (const [trait, weight] of Object.entries(formula)) {
    const traitValue = (player.personality as Record<string, number>)[trait] ?? 0;
    weightedSum += traitValue * weight;
  }

  return weightedSum;
}

/**
 * Find the best-fitting archetype for a player.
 * Returns the highest-scoring archetype whose score meets its threshold,
 * or null if none qualify.
 */
export function getArchetypeForPlayer(
  player: Player,
  archetypes: PlayerArchetype[],
): PlayerArchetype | null {
  if (!archetypes.length) return null;

  const matches: ArchetypeMatch[] = archetypes
    .map((archetype) => ({
      archetype,
      score: calculateArchetypeScore(player, archetype),
    }))
    .filter((match) => match.score >= match.archetype.traitMapping.threshold)
    .sort((a, b) => b.score - a.score);

  return matches.length > 0 ? matches[0].archetype : null;
}

/**
 * Get all archetypes with their scores, sorted descending.
 * Useful for debugging / admin views.
 */
export function getAllArchetypeMatches(
  player: Player,
  archetypes: PlayerArchetype[],
): ArchetypeMatch[] {
  return archetypes
    .map((archetype) => ({
      archetype,
      score: calculateArchetypeScore(player, archetype),
    }))
    .sort((a, b) => b.score - a.score);
}
