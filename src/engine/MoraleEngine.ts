import { useCoachStore } from '@/stores/coachStore';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { processWeeklyMoraleDecay, processOrganicRelationshipGrowth } from './RelationshipService';

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

  // 4. Fan Happiness Impact
  {
    const { FanEngine } = require('./FanEngine');
    const { useFanStore } = require('@/stores/fanStore');
    const currentWeek = useClubStore.getState().club.weekNumber ?? 1;
    const score = FanEngine.calculateScore(currentWeek);
    const tier = FanEngine.getTier(score);

    if (tier === 'Thrilled') {
      // +1 Morale to all players and coaches
      useSquadStore.getState().players.forEach(p => useSquadStore.getState().updateMorale(p.id, 1));
      useCoachStore.getState().coaches.forEach(c => useCoachStore.getState().updateMorale(c.id, 1));
    } else if (tier === 'Angry') {
      // -1 Morale to all players and coaches
      useSquadStore.getState().players.forEach(p => useSquadStore.getState().updateMorale(p.id, -1));
      useCoachStore.getState().coaches.forEach(c => useCoachStore.getState().updateMorale(c.id, -1));
    }
  }

  // 5. Manager trust decay: coaches with low trust in management lose morale
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
