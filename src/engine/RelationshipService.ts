import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useClubStore } from '@/stores/clubStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { Relationship } from '@/types/player';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { Scout } from '@/types/market';

type RelationshipEntity = Player | Coach | Scout;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getRelationshipValue(entity: RelationshipEntity, targetId: string): number {
  return (entity as { relationships?: Relationship[] }).relationships?.find((r) => r.id === targetId)?.value ?? 0;
}

export function hasNegativeRelations(entity: RelationshipEntity): boolean {
  return ((entity as { relationships?: Relationship[] }).relationships ?? []).some((r) => r.value < -20);
}

/** Update a relationship on a player in squadStore */
export function updatePlayerRelationship(
  playerId: string,
  targetId: string,
  targetType: 'player' | 'coach' | 'scout' | 'manager',
  delta: number,
): void {
  const { players, updatePlayer } = useSquadStore.getState();
  const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  const relationships = [...(player.relationships ?? [])];
  const idx = relationships.findIndex((r) => r.id === targetId);
  if (idx >= 0) {
    relationships[idx] = {
      ...relationships[idx],
      value: clamp(relationships[idx].value + delta, -100, 100),
      lastInteraction: weekNumber,
    };
  } else {
    relationships.push({
      id: targetId,
      type: targetType,
      value: clamp(delta, -100, 100),
      lastInteraction: weekNumber,
    });
  }
  updatePlayer(playerId, { relationships });
  useInteractionStore.getState().logInteraction({
    week: weekNumber,
    actorType: 'system',
    actorId: 'system',
    targetType: 'player',
    targetId: playerId,
    category: 'SYSTEM',
    subtype: 'weekly_decay',
    relationshipDelta: delta,
    traitDeltas: {},
    moraleDelta: 0,
    isVisibleToAmp: false,
    narrativeSummary: `Relationship updated with ${targetType} (${targetId}): ${delta > 0 ? '+' : ''}${delta}`,
  });
}

/** Update a relationship on a coach in coachStore */
export function updateCoachRelationship(
  coachId: string,
  targetId: string,
  targetType: 'player' | 'coach' | 'scout' | 'manager',
  delta: number,
): void {
  const { coaches, updateCoach } = useCoachStore.getState();
  const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
  const coach = coaches.find((c) => c.id === coachId);
  if (!coach) return;

  const relationships = [...(coach.relationships ?? [])];
  const idx = relationships.findIndex((r) => r.id === targetId);
  if (idx >= 0) {
    relationships[idx] = {
      ...relationships[idx],
      value: clamp(relationships[idx].value + delta, -100, 100),
      lastInteraction: weekNumber,
    };
  } else {
    relationships.push({
      id: targetId,
      type: targetType,
      value: clamp(delta, -100, 100),
      lastInteraction: weekNumber,
    });
  }
  updateCoach(coachId, { relationships });
  useInteractionStore.getState().logInteraction({
    week: weekNumber,
    actorType: 'system',
    actorId: 'system',
    targetType: 'coach',
    targetId: coachId,
    category: 'SYSTEM',
    subtype: 'weekly_decay',
    relationshipDelta: delta,
    traitDeltas: {},
    moraleDelta: 0,
    isVisibleToAmp: false,
    narrativeSummary: `Relationship updated with ${targetType} (${targetId}): ${delta > 0 ? '+' : ''}${delta}`,
  });
}

/** Process weekly morale decay from negative relationships */
export function processWeeklyMoraleDecay(): void {
  const { players, updatePlayer } = useSquadStore.getState();
  const { coaches, updateCoach } = useCoachStore.getState();
  const { scouts, updateScout } = useScoutStore.getState();

  players.forEach((entity) => {
    if (hasNegativeRelations(entity) && Math.random() < 0.10) {
      const newMorale = Math.max(0, (entity.morale ?? 70) - 5);
      updatePlayer(entity.id, { morale: newMorale });
    }
  });
  coaches.forEach((entity) => {
    if (hasNegativeRelations(entity) && Math.random() < 0.10) {
      const newMorale = Math.max(0, (entity.morale ?? 70) - 5);
      updateCoach(entity.id, { morale: newMorale });
    }
  });
  scouts.forEach((entity) => {
    if (hasNegativeRelations(entity) && Math.random() < 0.10) {
      const newMorale = Math.max(0, (entity.morale ?? 70) - 5);
      updateScout(entity.id, { morale: newMorale });
    }
  });
}

/** Organic weekly relationship growth between players and their coaches */
export function processOrganicRelationshipGrowth(): void {
  const { players } = useSquadStore.getState();
  const { coaches } = useCoachStore.getState();

  players.forEach((player) => {
    const coach = player.assignedCoachId
      ? coaches.find((c) => c.id === player.assignedCoachId) ?? null
      : null;
    if (!coach) return;

    const loyaltyBoost = (player.personality.loyalty ?? 10) / 20;
    const influenceBoost = coach.influence / 20;
    const growthChance = 0.05 * (1 + loyaltyBoost + influenceBoost);

    if (Math.random() < growthChance) {
      updatePlayerRelationship(player.id, coach.id, 'coach', 5);
      updateCoachRelationship(coach.id, player.id, 'player', 5);
    }
  });
}
