import { simulationService } from './SimulationService';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { EventChoice, NarrativeMessage } from '@/types/narrative';
import { InboxMessage } from '@/stores/inboxStore';

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

/**
 * Handle an accept or decline response to a guardian inbox message.
 * Called from inbox.tsx after the manager taps Accept or Reject.
 */
export function handleGuardianResponse(
  message: InboxMessage,
  response: 'accepted' | 'rejected',
): void {
  const meta = message.metadata as Record<string, unknown> | undefined;
  if (!meta) return;

  const worstGuardianId = meta.worstGuardianId as string | undefined;
  const costPence = meta.costPence as number | undefined;
  const guardianIds = (meta.guardianIds as string[] | undefined) ?? [];
  const playerId = message.entityId;
  if (!playerId || !worstGuardianId) return;

  const { players, updateMorale, updateTrait } = useSquadStore.getState();
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  const weekNumber = useAcademyStore.getState().academy.weekNumber ?? 1;
  const { updateGuardian } = useGuardianStore.getState();
  const worstGuardian = useGuardianStore.getState().guardians.find((g) => g.id === worstGuardianId);
  if (!worstGuardian) return;

  const cfg = useGameConfigStore.getState().config;

  // Reset ignoredRequestCount for all guardians of this player on any response
  guardianIds.forEach((gId) => updateGuardian(gId, { ignoredRequestCount: 0 }));

  // Surname-matching siblings (exclude the player themselves)
  const playerSurname = player.name.split(' ').at(-1) ?? '';
  const siblings = players.filter(
    (p) => p.id !== playerId && p.isActive && p.name.split(' ').at(-1) === playerSurname,
  );

  if (response === 'accepted') {
    updateGuardian(worstGuardianId, {
      loyaltyToAcademy: Math.min(100, worstGuardian.loyaltyToAcademy + cfg.guardianConvinceGuardianLoyaltyBoost),
      demandLevel: Math.min(10, worstGuardian.demandLevel + cfg.guardianConvinceGuardianDemandIncrease),
    });

    updateMorale(playerId, cfg.guardianConvinceMoraleBoost);

    // Deduct financial cost if applicable
    if (costPence !== undefined) {
      // balance is stored in pence — deduct pence directly
      useAcademyStore.getState().addBalance(-costPence);

      // Ledger entry — amount in whole pounds, negative = expense
      useFinanceStore.getState().addTransaction({
        amount: -Math.round(costPence / 100),
        category: 'guardian_payment',
        description: `Guardian payment — ${player.name}`,
        weekNumber,
      });
    }
  } else {
    updateGuardian(worstGuardianId, {
      loyaltyToAcademy: Math.max(0, worstGuardian.loyaltyToAcademy - cfg.guardianIgnoreGuardianLoyaltyPenalty),
      demandLevel: Math.min(10, worstGuardian.demandLevel + cfg.guardianIgnoreGuardianDemandIncrease),
      ignoredRequestCount: worstGuardian.ignoredRequestCount + 1,
    });

    updateMorale(playerId, -cfg.guardianIgnoreMoralePenalty);
    updateTrait(playerId, 'loyalty', -cfg.guardianIgnoreLoyaltyTraitPenalty);

    siblings.forEach((sibling) => {
      updateMorale(sibling.id, -cfg.guardianIgnoreSiblingMoralePenalty);
      updateTrait(sibling.id, 'loyalty', -cfg.guardianIgnoreSiblingLoyaltyTraitPenalty);
    });
  }
}
