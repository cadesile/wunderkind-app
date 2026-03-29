import { useInboxStore } from '@/stores/inboxStore';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMarketStore } from '@/stores/marketStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { calculateNetSalePrice } from '@/engine/finance';

/**
 * Accept an agent transfer offer:
 * 1. Mark offer accepted in inbox store
 * 2. Mark player as transferred (isActive: false, status: 'transferred_via_agent')
 * 3. Credit net proceeds to academy balance (pence)
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
  const netPounds = Math.round(netPence / 100); // whole pounds — used for ledger display only
  const agentCutPence = offer.estimatedFee - Math.round(offer.estimatedFee * (1 - offer.agentCommissionRate / 100));
  const investorCutPence = Math.round(offer.estimatedFee * (1 - offer.agentCommissionRate / 100)) - netPence;

  // balance is stored in pence — credit pence directly
  // addEarnings updates totalCareerEarnings (the SALES dashboard stat)
  useAcademyStore.getState().addBalance(netPence);
  useAcademyStore.getState().addEarnings(netPence);

  const weekNumber = academy.weekNumber;
  const financeStore = useFinanceStore.getState();

  // Ledger entry — net amount after all deductions (whole pounds)
  financeStore.addTransaction({
    amount: netPounds,
    category: 'transfer_fee',
    description: `${offer.playerName} → ${offer.destinationClub} (via ${offer.agentName})`,
    weekNumber,
  });

  // Separate ledger row for investor equity cut
  if (investorCutPence > 0 && investorEquityPcts.length > 0) {
    const investorCutPounds = Math.round(investorCutPence / 100);
    financeStore.addTransaction({
      amount: -investorCutPounds,
      category: 'investment',
      description: `${investorEquityPcts[0]}% equity cut — ${offer.playerName} sale`,
      weekNumber,
    });
  }

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

  // Reputation effects: compare fee against rough fair value (OVR × £1,000 in pence)
  const { players: currentSquad } = useSquadStore.getState();
  const soldPlayer = currentSquad.find((p) => p.id === offer.playerId);
  const { setReputation, markRepActivity } = useAcademyStore.getState();

  if (soldPlayer) {
    const { playerFeeMultiplier } = useGameConfigStore.getState().config;
    const fairValuePence = soldPlayer.overallRating * playerFeeMultiplier * 100;
    const ratio = fairValuePence > 0 ? offer.estimatedFee / fairValuePence : 1;

    if (ratio >= 1.25) {
      // Excellent sale — well above market
      setReputation(2.5);
      markRepActivity();
    } else if (ratio >= 0.85) {
      // Fair sale
      setReputation(1.5);
      markRepActivity();
    } else if (ratio < 0.5) {
      // Significantly undersold — damages reputation
      setReputation(-2.0);
    } else {
      // Below fair value — minor rep hit
      setReputation(-1.0);
    }
  }
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
