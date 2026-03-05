import { simulationService } from './SimulationService';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useAcademyStore } from '@/stores/academyStore';
import { EventChoice, NarrativeMessage } from '@/types/narrative';

class ReactionHandler {
  /**
   * Apply the effects of a player's choice and mark the message as responded.
   * All changes are local — no network calls triggered here.
   */
  handleChoice(message: NarrativeMessage, choice: EventChoice): void {
    // Build entity map from the message's affectedEntities array
    const entityMap: Record<string, string> = {};
    message.affectedEntities.forEach((id, i) => {
      entityMap[`player_${i + 1}`] = id;
    });

    if (choice.stat_changes.length > 0) {
      simulationService.applyStatChanges(choice.stat_changes, entityMap);
    }

    if (choice.manager_shift) {
      useAcademyStore.getState().updateManagerPersonality(choice.manager_shift);
    }

    useNarrativeStore.getState().markAsResponded(message.id);
  }
}

export const reactionHandler = new ReactionHandler();
