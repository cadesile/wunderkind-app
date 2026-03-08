import { useCoachStore } from '@/stores/coachStore';
import { processWeeklyMoraleDecay, processOrganicRelationshipGrowth, updateCoachRelationship } from './RelationshipService';

/**
 * Process all morale and relationship effects for the weekly tick.
 * Called AFTER training XP calculation so low-morale coach flags are set.
 */
export function processMoraleAndRelationships(): void {
  // 1. Set effectiveInfluence and isLowMorale flags on coaches
  useCoachStore.getState().setLowMoraleFlags();

  // 2. Morale decay from negative relationships
  processWeeklyMoraleDecay();

  // 3. Organic relationship growth between players and coaches
  processOrganicRelationshipGrowth();

  // 4. Manager trust decay: coaches with low trust in management lose morale
  const coaches = useCoachStore.getState().coaches;
  coaches.forEach((coach) => {
    const managerRel = coach.relationships?.find(
      (r) => r.id === 'manager' && r.type === 'manager',
    );
    if (managerRel && managerRel.value < -20 && Math.random() < 0.15) {
      useCoachStore.getState().updateMorale(coach.id, -5);
    }
  });
}
