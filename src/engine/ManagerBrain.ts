import { Coach } from '@/types/coach';
import { Player } from '@/types/player';
import { Guardian } from '@/types/guardian';
import { TransferOffer, MarketPlayer } from '@/types/market';
import { getFormationTargets } from './MarketEngine';
import { useCoachStore } from '@/stores/coachStore';
import { useSquadStore } from '@/stores/squadStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { useFinanceStore } from '@/stores/financeStore';

export class ManagerBrain {
  /**
   * Decides whether the manager should support or punish a player.
   */
  static decideSupportOrPunish(manager: Coach, player: Player): 'support' | 'punish' {
    const rel = player.relationships?.find(r => r.id === manager.id && r.type === 'coach')?.value ?? 0;
    const { professionalism, pressure, temperament, consistency } = manager.personality;

    let score = 50; 
    score += (professionalism - 10) * 2;
    score += (temperament - 10) * 2;
    score += rel / 2;
    score -= (pressure - 10) * 1.5;

    const randomness = (20 - consistency) * 2;
    const finalScore = score + (Math.random() * randomness - (randomness / 2));

    return finalScore >= 50 ? 'support' : 'punish';
  }

  /**
   * Decides whether to accept or ignore a guardian request.
   */
  static decideGuardianRequest(manager: Coach, player: Player, guardian: Guardian, isFinancial: boolean): 'accept' | 'ignore' {
    const rel = player.relationships?.find(r => r.id === manager.id && r.type === 'coach')?.value ?? 0;
    const { professionalism, pressure, temperament, consistency } = manager.personality;
    
    let score = 40; // Base bias slightly towards ignore for requests
    score += (professionalism - 10) * 1.5;
    score += (temperament - 10) * 1.5;
    score += rel / 3;
    score -= (pressure - 10) * 2;
    
    // Guardian factors
    score -= (guardian.demandLevel - 5) * 3;
    score += (guardian.loyaltyToClub - 50) / 4;

    if (isFinancial) score -= 15; // Financial requests are harder to accept

    const randomness = (20 - consistency) * 3;
    const finalScore = score + (Math.random() * randomness - (randomness / 2));

    return finalScore >= 50 ? 'accept' : 'ignore';
  }

  /**
   * Processes a behavioral incident automatically.
   */
  static handleBehavioralIncident(manager: Coach, player: Player, description: string, week: number, logToInteractionStore = true) {
    const action = this.decideSupportOrPunish(manager, player);
    const { updatePlayer } = useSquadStore.getState();
    const { logInteraction } = useInteractionStore.getState();
    const moraleDelta = action === 'support' ? 5 : -5;

    updatePlayer(player.id, { morale: Math.max(0, Math.min(100, (player.morale ?? 70) + moraleDelta)) });
    
    if (logToInteractionStore) {
      logInteraction({
        week,
        actorType: 'coach',
        actorId: manager.id,
        targetType: 'player',
        targetId: player.id,
        category: 'COACH_PLAYER',
        subtype: action,
        relationshipDelta: action === 'support' ? 2 : -2,
        traitDeltas: {},
        moraleDelta,
        isVisibleToAmp: true,
        visibilityReason: 'auto_managed',
        narrativeSummary: `${manager.name} (Auto-Manager) ${action === 'support' ? 'supported' : 'disciplined'} ${player.name} after a behavioral incident: "${description}"`,
      });
    }

    return action;
  }

  /**
   * Processes a guardian request automatically.
   */
  static handleGuardianRequest(manager: Coach, player: Player, guardian: Guardian, message: any) {
    const isFinancial = message.metadata?.costPence !== undefined;
    const action = this.decideGuardianRequest(manager, player, guardian, isFinancial);
    const { updateGuardian } = useGuardianStore.getState();
    const { updatePlayer } = useSquadStore.getState();
    const { logInteraction } = useInteractionStore.getState();
    const { club, addBalance } = useClubStore.getState();
    const week = useClubStore.getState().club.weekNumber ?? 1;

    if (action === 'accept') {
      const cost = message.metadata?.costPence ?? 0;
      if (cost > 0 && club.balance >= cost) {
        addBalance(-cost);
        useFinanceStore.getState().addTransaction({
          amount: -cost,
          category: 'guardian_payment',
          description: `Auto-Accepted: ${guardian.firstName} ${guardian.lastName} request`,
          weekNumber: week,
        });
      }
      
      updateGuardian(guardian.id, { loyaltyToClub: Math.min(100, guardian.loyaltyToClub + 10) });
      updatePlayer(player.id, { morale: Math.min(100, (player.morale ?? 70) + 5) });
      
      logInteraction({
        week,
        actorType: 'coach',
        actorId: manager.id,
        targetType: 'player',
        targetId: player.id,
        category: 'COACH_PLAYER',
        subtype: 'convince', // Reusing 'convince' subtype logic for acceptance
        relationshipDelta: 2,
        traitDeltas: {},
        moraleDelta: 5,
        isVisibleToAmp: true,
        visibilityReason: 'auto_managed',
        narrativeSummary: `${manager.name} (Auto-Manager) accepted a request from ${player.name}'s guardian (${guardian.firstName}).`,
      });
    } else {
      updateGuardian(guardian.id, { 
        loyaltyToClub: Math.max(0, guardian.loyaltyToClub - 8),
        ignoredRequestCount: (guardian.ignoredRequestCount ?? 0) + 1
      });
      updatePlayer(player.id, { morale: Math.max(0, (player.morale ?? 70) - 5) });

      logInteraction({
        week,
        actorType: 'coach',
        actorId: manager.id,
        targetType: 'player',
        targetId: player.id,
        category: 'COACH_PLAYER',
        subtype: 'ignore',
        relationshipDelta: -2,
        traitDeltas: {},
        moraleDelta: -5,
        isVisibleToAmp: true,
        visibilityReason: 'auto_managed',
        narrativeSummary: `${manager.name} (Auto-Manager) ignored a request from ${player.name}'s guardian (${guardian.firstName}).`,
      });
    }

    useInboxStore.getState().respond(
      message.id,
      action === 'accept' ? 'accepted' : 'rejected',
      false,
      action === 'accept' ? 0 : 1
    );
  }

  /**
   * Assess whether the manager recommends accepting or rejecting a transfer offer.
   */
  static assessTransferOffer(
    manager: Coach,
    player: Player,
    offer: TransferOffer,
    clubBalance: number,
    squad: Player[],
    formation = '4-4-2',
  ): { recommendation: 'sell' | 'keep'; reasoning: string } {
    const { professionalism, ambition, consistency } = manager.personality;

    let score = 50;

    // Fee vs. transfer value
    const tv    = player.transferValue ?? player.overallRating * 1000;
    const ratio = tv > 0 ? offer.fee / tv : 1;
    if (ratio >= 1.2) score += (ratio - 1.2) * 40;
    if (ratio < 0.9)  score -= 20;

    // Squad players at this position after the sale (exclude the player being sold)
    const posPlayers = squad.filter(
      (p) => p.position === player.position && p.isActive && p.id !== player.id,
    );
    const posDepth = posPlayers.length;

    // Quality comparison: is this player the best at their position?
    const playerOvr       = player.overallRating ?? 0;
    const bestRemainingOvr = posPlayers.reduce((best, p) => Math.max(best, p.overallRating ?? 0), 0);
    const ovrGap           = playerOvr - bestRemainingOvr; // positive = player is better than next best
    const isSquadBest      = posDepth > 0 && ovrGap > 0;

    // Quality-based score adjustment
    if (isSquadBest && ovrGap >= 10) score -= 25; // significantly better than anyone else — strong keep signal
    else if (isSquadBest && ovrGap >= 5) score -= 15; // notably better
    else if (isSquadBest)              score -= 8;  // marginally better
    else if (ovrGap <= -10)            score += 12; // player is noticeably below next best — easier to sell

    // Formation-aware depth targets
    const targets = getFormationTargets(formation);
    const pos = player.position as keyof typeof targets;
    const minTarget = targets[pos]?.min ?? 4; // minimum squad players needed at this position

    if (posDepth < 1)          score -= 30; // would leave us with nobody
    if (posDepth < minTarget)  score -= 15; // below formation squad minimum
    if (posDepth >= minTarget) score += 10; // well covered per formation targets

    // Financial pressure
    if (clubBalance < 2_000_000) score += 20; // < £20,000

    // Manager personality
    score += (ambition - 10) * 1.5;
    score -= (professionalism - 10) * 1;

    const noise = (20 - consistency) * 2;
    score += Math.random() * noise - noise / 2;

    const recommendation: 'sell' | 'keep' = score >= 50 ? 'sell' : 'keep';

    let reasoning: string;
    if (recommendation === 'sell') {
      if (ratio >= 1.5) {
        reasoning = `The offer is ${Math.round(ratio * 100)}% of transfer value — an excellent return. I'd take it.`;
      } else if (isSquadBest && ratio >= 1.2) {
        reasoning = `They're our best ${player.position}, but the fee is too good to turn down. Worth selling if we reinvest well.`;
      } else if (clubBalance < 2_000_000) {
        reasoning = 'We are tight on funds. Selling could give us room to strengthen elsewhere.';
      } else if (ovrGap <= -10) {
        reasoning = `We have better ${player.position}s in the squad. The fee is decent — move them on.`;
      } else {
        reasoning = 'We have good cover at this position and the fee is reasonable.';
      }
    } else {
      if (posDepth < 1) {
        reasoning = `${player.name} is our only player in this position. Losing them now would hurt us badly.`;
      } else if (isSquadBest && ovrGap >= 10) {
        reasoning = `They're significantly better than anyone else we have at ${player.position}. Selling would leave a real gap in quality.`;
      } else if (isSquadBest) {
        reasoning = `${player.name} is our best ${player.position}. I wouldn't sell without a quality replacement lined up.`;
      } else if (posDepth < minTarget) {
        reasoning = `We only have ${posDepth} player${posDepth === 1 ? '' : 's'} left in this position — we need at least ${minTarget} for our ${formation}. I'd keep them.`;
      } else if (ratio < 1.0) {
        reasoning = 'The offer is below fair value. We should hold out for a better deal.';
      } else {
        reasoning = 'I think we need to keep the squad intact right now.';
      }
    }

    return { recommendation, reasoning };
  }

  /**
   * Assess whether the manager recommends signing a newly scouted player.
   *
   * @param manager        The coach entity with role 'manager'
   * @param marketPlayer   The revealed MarketPlayer
   * @param squad          Full AMP squad (for positional depth check)
   * @param clubBalance    AMP club balance in pence (stores convention)
   * @param weeklyWage     Asking weekly wage in pence (matches Player.wage / MarketPlayer.currentOffer)
   */
  static assessScoutedPlayer(
    manager: Coach,
    marketPlayer: MarketPlayer,
    squad: Player[],
    clubBalance: number,
    weeklyWage: number,
  ): { recommendation: 'sign' | 'pass'; reasoning: string } {
    const { professionalism, consistency } = manager.personality;

    let score = 50;

    const posDepth = squad.filter((p) => p.position === marketPlayer.position && p.isActive).length;
    if (posDepth <= 1) score += 25;
    if (posDepth >= 5) score -= 15;

    // Wage affordability — compare 10 weeks' cost to balance (all in pence)
    const tenWeekCost = weeklyWage * 10;
    if (tenWeekCost > clubBalance * 0.5) score -= 20;
    if (tenWeekCost < clubBalance * 0.1) score += 10;

    if (marketPlayer.currentAbility >= 75) score += 10;
    if (marketPlayer.potential >= 4)       score += 5;

    score -= (professionalism - 10) * 1;

    const noise = (20 - consistency) * 2;
    score += Math.random() * noise - noise / 2;

    const recommendation: 'sign' | 'pass' = score >= 50 ? 'sign' : 'pass';

    let reasoning: string;
    if (recommendation === 'sign') {
      if (posDepth <= 1) {
        reasoning = `We really need cover in this position. I'd sign them quickly.`;
      } else if (marketPlayer.currentAbility >= 75) {
        reasoning = 'The ability level is impressive. Good value for the squad.';
      } else {
        reasoning = 'Looks like a solid option — worth bringing in.';
      }
    } else {
      if (tenWeekCost > clubBalance * 0.5) {
        reasoning = 'The wage demand is too high for our current financial situation.';
      } else if (posDepth >= 5) {
        reasoning = "We're well covered in that position. I'd pass for now.";
      } else {
        reasoning = "Decent player, but not what we need most right now.";
      }
    }

    return { recommendation, reasoning };
  }
}

