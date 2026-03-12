import { useInboxStore } from '@/stores/inboxStore';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMarketStore } from '@/stores/marketStore';
import { calculateNetSalePrice } from '@/engine/finance';

/**
 * Accept an agent transfer offer:
 * 1. Mark offer accepted in inbox store
 * 2. Mark player as transferred (isActive: false, status: 'transferred_via_agent')
 * 3. Credit net proceeds to academy balance (whole pounds)
 * 4. Record in ledger (transfer_fee) and transfer history
 */
export function handleAcceptAgentOffer(offerId: string): void {
  const { agentOffers, acceptAgentOffer } = useInboxStore.getState();
  const offer = agentOffers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return;

  acceptAgentOffer(offerId);

  const { players, updatePlayer } = useSquadStore.getState();
  const player = players.find((p) => p.id === offer.playerId);
  if (!player) return;

  updatePlayer(offer.playerId, {
    isActive: false,
    status: 'transferred_via_agent',
    agentId: offer.agentId,
  });

  // Apply both agent commission AND investor equity deduction
  const { academy } = useAcademyStore.getState();
  const { investors } = useMarketStore.getState();
  const investorEquityPcts = investors
    .filter((inv) => inv.id === academy.investorId)
    .map((inv) => inv.equityTaken);

  // calculateNetSalePrice: gross × (1 − agentComm) × (1 − investorEquity) — all in pence
  const netPence = calculateNetSalePrice(
    offer.estimatedFee,
    offer.agentCommissionRate,
    investorEquityPcts,
  );
  const netPounds = Math.round(netPence / 100);
  const agentCutPence = offer.estimatedFee - Math.round(offer.estimatedFee * (1 - offer.agentCommissionRate / 100));
  const investorCutPence = Math.round(offer.estimatedFee * (1 - offer.agentCommissionRate / 100)) - netPence;

  useAcademyStore.getState().addBalance(netPounds);

  const weekNumber = academy.weekNumber;
  const financeStore = useFinanceStore.getState();

  // Ledger entry — net amount after all deductions (whole pounds)
  const investorNote = investorEquityPcts.length > 0
    ? ` [${investorEquityPcts[0]}% equity deducted]`
    : '';
  financeStore.addTransaction({
    amount: netPounds,
    category: 'transfer_fee',
    description: `${offer.playerName} → ${offer.destinationClub} (via ${offer.agentName})${investorNote}`,
    weekNumber,
  });

  // Detailed transfer record (fees stored in pence)
  financeStore.addTransfer({
    playerId: offer.playerId,
    playerName: offer.playerName,
    destinationClub: offer.destinationClub,
    grossFee: offer.estimatedFee,
    agentCommission: agentCutPence,
    netProceeds: netPence,
    week: weekNumber,
    type: 'agent_assisted',
  });
}

/**
 * Reject an agent transfer offer:
 * 1. Mark offer rejected in inbox store
 * 2. Reduce player morale by 5% (clamped to 0)
 */
export function handleRejectAgentOffer(offerId: string): void {
  const { agentOffers, rejectAgentOffer } = useInboxStore.getState();
  const offer = agentOffers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return;

  rejectAgentOffer(offerId);

  const { players, updatePlayer } = useSquadStore.getState();
  const player = players.find((p) => p.id === offer.playerId);
  if (!player) return;

  const newMorale = Math.max(0, Math.floor((player.morale ?? 70) * 0.95));
  updatePlayer(offer.playerId, { morale: newMorale });
}
