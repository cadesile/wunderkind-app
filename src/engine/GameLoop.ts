import { calculateTraitShifts, generateIncidents } from './personality';
import { calculateWeeklyFinances } from './finance';
import {
  calculateWeeklyXP,
  calculateInjuryProbability,
  calculateReputationDelta,
  calculateInjuryDuration,
} from './FormulaEngine';
import { simulationService } from './SimulationService';
import { generateAgentOffer } from './agentOffers';
import { computePlayerDevelopment, computeCoachPerformanceScore } from './DevelopmentService';
import { processScoutingTasks, processMissions, refreshMarketOffers } from './ScoutingService';
import { calculateMatchdayIncome } from '@/utils/matchdayIncome';
import { processMoraleAndRelationships } from './MoraleEngine';
import { processSocialGraph } from './SocialGraphEngine';
import { processGuardianTick } from './GuardianEngine';
import { computeSponsorOffer, getSponsorOfferProbability, getInvestorOfferProbability } from './sponsorEngine';
import { getRelationshipValue, updatePlayerRelationship } from './RelationshipService';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLoanStore } from '@/stores/loanStore';
import { useMarketStore } from '@/stores/marketStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useAltercationStore } from '@/stores/altercationStore';
import { useEventChainStore } from '@/stores/eventChainStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { WeeklyTick, AltercationBlock } from '@/types/game';
import { FacilityLevels, repairFacilityCost } from '@/types/facility';
import { PersonalityMatrix } from '@/types/player';
import { CompanySize } from '@/types/market';
import { TIER_OVR_CEILING } from '@/types/club';
import { getEffectiveTier } from '@/utils/tierGate';
import { calculateClubValuation } from '@/hooks/useClubMetrics';

type InjuryTier = {
  severity: 'minor' | 'moderate' | 'serious';
  minWeeks: number;
  maxWeeks: number;
  weight: number;
};

function pickInjurySeverity(tiers: InjuryTier[]): InjuryTier {
  const totalWeight = tiers.reduce((s, t) => s + t.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const tier of tiers) {
    rand -= tier.weight;
    if (rand <= 0) return tier;
  }
  return tiers[0];
}

/**
 * Processes one Weekly Tick entirely on-device.
 *
 * XP Formula:   WeeklyXP = BaseXP × (1 + PitchLevel × 0.05) × (1 + TotalCoachInfluence / 100)
 * Injury Formula: InjuryProb = BaseProb × (1 − LabLevel × 0.08)
 * Reputation:   0.5 + mediaCenterLevel × 1.2 per week (0–100 scale)
 *
 * Mutates Zustand stores; returns a WeeklyTick for sync queuing.
 */
export function processWeeklyTick(): WeeklyTick {
  const config = useGameConfigStore.getState().config;

  const INJURY_TIERS: InjuryTier[] = [
    { severity: 'minor',    minWeeks: 2, maxWeeks: 3,  weight: config.injuryMinorWeight },
    { severity: 'moderate', minWeeks: 4, maxWeeks: 6,  weight: config.injuryModerateWeight },
    { severity: 'serious',  minWeeks: 8, maxWeeks: 12, weight: config.injurySeriousWeight },
  ];

  const { players: allPlayers, applyWeeklyPlayerUpdates, setPlayerInjury, tickInjuries } = useSquadStore.getState();
  // Only process active players — inactive players (guardian withdrawals, etc.) must not
  // generate new incidents, injuries, or trait shifts.
  const players = allPlayers.filter((p) => p.isActive !== false);
  const { club, addBalance, addEarnings, setReputation, incrementWeek } = useClubStore.getState();
  const { addIncident, addMessage, addAgentOffer, expireOldOffers, messages: inboxMessages } = useInboxStore.getState();
  const { coaches } = useCoachStore.getState();
  const { levels, conditions, templates: facilityTemplates } = useFacilityStore.getState();

  // Effective level = level × (condition / 100), used to scale all facility benefits
  const eff = (slug: string) => (levels[slug] ?? 0) * ((conditions[slug] ?? 100) / 100);
  const { processWeeklyRepayments, totalWeeklyRepayment } = useLoanStore.getState();
  const { sponsors: allSponsors, investors: allInvestors } = useMarketStore.getState();

  const weekNumber = club.weekNumber ?? 1;

  // Expire stale chain boosts before evaluating any events this tick
  useEventChainStore.getState().expireChains(weekNumber);

  // ── 0a. Sponsor contract expiry ───────────────────────────────────────────────
  // Run before finances so expired contracts don't generate income this tick.
  {
    const { removeSponsorContract } = useClubStore.getState();
    const expired = (useClubStore.getState().club.sponsorContracts ?? []).filter((c) => c.endWeek <= weekNumber);
    for (const contract of expired) {
      removeSponsorContract(contract.id);
      const sponsor = allSponsors.find((s) => s.id === contract.id);
      const sponsorName = sponsor?.name ?? 'your sponsor';

      // Expiry notification
      addMessage({
        id: `sponsor-expired-${contract.id}-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Sponsorship Deal Ended',
        body: `Your sponsorship deal with ${sponsorName} has come to an end. The club will no longer receive their weekly contribution.`,
        isRead: false,
      });

      // 50/50 renewal offer
      if (Math.random() < 0.5 && sponsor) {
        const renewConfig = useGameConfigStore.getState().config;
        const offer = computeSponsorOffer(sponsor.companySize, club.reputation, renewConfig);
        const renewWeeklyPounds = Math.round(offer.weeklyPaymentPence / 100);
        addMessage({
          id: `sponsor-renewal-${contract.id}-wk${weekNumber}`,
          type: 'sponsor',
          week: weekNumber,
          subject: 'Renewal Offer',
          body: `${sponsorName} has offered to renew their sponsorship. They are offering £${renewWeeklyPounds.toLocaleString()} per week for ${offer.contractWeeks} weeks.`,
          isRead: false,
          requiresResponse: true,
          entityId: sponsor.id,
          metadata: {
            sponsorId: sponsor.id,
            sponsorName: sponsor.name,
            weeklyPayment: offer.weeklyPaymentPence,
            contractWeeks: offer.contractWeeks,
            companySize: sponsor.companySize,
          },
        });
      }
    }
  }

  // ── 0. Narrative simulation tick ──────────────────────────────────────────────
  // Processes active multi-week effects and potentially fires a story event.
  // Runs before stat changes so any narrative effects can be overridden by the
  // deterministic weekly engine if needed.
  simulationService.processDailyTick();

  // ── 1. XP Formula ────────────────────────────────────────────────────────────
  // Tactical Room boosts coach performance; conditions scale all benefits
  const tacticalBoost = 1 + eff('tactical_room') * 0.05;
  const totalCoachPerformance = coaches.reduce(
    (sum, c) => sum + computeCoachPerformanceScore(c), 0,
  ) * tacticalBoost;
  const weeklyXP = calculateWeeklyXP(eff('technical_zone'), totalCoachPerformance, config.baseXP);

  // ── 2. Injury Probability ─────────────────────────────────────────────────────
  const injuryProb = calculateInjuryProbability(eff('physio_clinic'), config.baseInjuryProbability);

  // ── 3. Personality shifts ─────────────────────────────────────────────────────
  const traitShifts: Record<string, Partial<PersonalityMatrix>> = {};

  players.forEach((player) => {
    traitShifts[player.id] = calculateTraitShifts(
      player,
      config.regressionUpperThreshold,
      config.regressionLowerThreshold,
    );
  });

  // Trait shifts are applied later alongside development updates (single set() call).

  // ── 3b. Injury rolls ──────────────────────────────────────────────────────────
  // Only uninjured players are eligible. Cap: no more than 30% of squad injured at once.
  const currentInjuredCount = players.filter((p) => !!p.injury).length;
  const maxAllowed = Math.floor(players.length * 0.3);
  const eligibleForInjury = players.filter((p) => !p.injury);

  const injuryCandidates: string[] = [];
  eligibleForInjury.forEach((player) => {
    if (Math.random() < injuryProb) {
      injuryCandidates.push(player.id);
    }
  });

  const slotsAvailable = Math.max(0, maxAllowed - currentInjuredCount);
  const injuredPlayerIds = injuryCandidates.slice(0, slotsAvailable);

  // Apply injuries and collect metadata for inbox messages
  type NewInjury = { playerId: string; severity: 'minor' | 'moderate' | 'serious'; weeksRemaining: number };
  const newInjuries: NewInjury[] = [];
  injuredPlayerIds.forEach((id) => {
    const tier = pickInjurySeverity(INJURY_TIERS);
    const weeksRemaining = calculateInjuryDuration(tier, eff('physio_clinic'), eff('hydro_pool'));
    setPlayerInjury(id, { severity: tier.severity, weeksRemaining, injuredWeek: weekNumber });
    newInjuries.push({ playerId: id, severity: tier.severity, weeksRemaining });
  });

  // ── 3c. Contract expiry ───────────────────────────────────────────────────
  // Check every active player's enrollment. Fires inbox warnings at 12 and 4
  // weeks remaining, applies morale decay during the critical window (1–11w),
  // and removes the player when the contract expires (weeksRemaining <= 0).
  {
    const { updateMorale, removePlayer: removeExpiredPlayer } = useSquadStore.getState();
    const { addTransfer } = useFinanceStore.getState();

    players.forEach((player) => {
      if (player.enrollmentEndWeek === undefined) return;
      const weeksRemaining = player.enrollmentEndWeek - weekNumber;

      if (weeksRemaining <= 0) {
        // Contract expired — player leaves the club
        removeExpiredPlayer(player.id);
        useInboxStore.getState().purgeForPlayer(player.id);
        addTransfer({
          playerId: player.id,
          playerName: player.name,
          destinationClub: 'Contract Expired',
          grossFee: 0,
          agentCommission: 0,
          netProceeds: 0,
          type: 'free_release',
          week: weekNumber,
        });
        addMessage({
          id: `contract-expired-${player.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: `${player.name} Has Left`,
          body: `${player.name}'s enrollment has expired and they have left the club. Renew contracts before they reach zero to keep your best players.`,
          isRead: false,
          entityId: player.id,
        });
        setReputation(-0.5);
        return;
      }

      // Morale decay during critical window (1–11 weeks remaining)
      if (weeksRemaining <= 11) {
        updateMorale(player.id, -2);
      }

      // 12-week warning (fires exactly once)
      if (weeksRemaining === 12) {
        addMessage({
          id: `contract-warn-12-${player.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Enrollment Expiring Soon',
          body: `${player.name}'s enrollment ends in 12 weeks. Renew their contract from their player page or they will leave the club.`,
          isRead: false,
          entityId: player.id,
        });
      }

      // 4-week final warning (fires exactly once)
      if (weeksRemaining === 4) {
        addMessage({
          id: `contract-warn-4-${player.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Enrollment Ending — Final Notice',
          body: `${player.name}'s enrollment ends in 4 weeks. Their morale is suffering. Act now or they will leave.`,
          isRead: false,
          entityId: player.id,
        });
      }
    });
  }

  // ── 4. Behavioral incidents ───────────────────────────────────────────────────
  const incidents = players.flatMap((p) =>
    generateIncidents(p, weekNumber, players.filter((m) => m.id !== p.id), config),
  );
  incidents.forEach(addIncident);

  // ── 4b. Behavioral digest + altercation morale / relationship effects ──────────
  // All behavioral incidents are grouped into one digest message per week.
  // Block-triggering serious altercations are suppressed from inbox — surfaced via dialog only.
  const digestLines: string[] = [];
  const digestPlayerIds = new Set<string>();

  // Non-altercation negative incidents → digest
  incidents
    .filter((i) => i.type === 'negative' && !i.id.startsWith('altercation:'))
    .forEach((incident) => {
      digestLines.push(incident.description);
      digestPlayerIds.add(incident.playerId);
    });

  const altercationIncidents = incidents.filter((i) => i.id.startsWith('altercation:'));
  const newAltercationBlocks: AltercationBlock[] = [];

  altercationIncidents.forEach((incident) => {
    // ID format: "altercation:<playerAId>:<playerBId>:<week>"
    const [, playerAId, playerBId] = incident.id.split(':');
    const playerA = players.find((p) => p.id === playerAId);
    const playerB = players.find((p) => p.id === playerBId);
    if (!playerA || !playerB) return;

    const severity = incident.severity ?? 'minor';
    const moraleDelta = severity === 'serious' ? -20 : -8;
    const relDelta    = severity === 'serious' ? -40 : -15;

    const { updateMorale } = useSquadStore.getState();
    updateMorale(playerAId, moraleDelta);
    updateMorale(playerBId, moraleDelta);
    updatePlayerRelationship(playerAId, playerBId, 'player', relDelta);
    updatePlayerRelationship(playerBId, playerAId, 'player', relDelta);

    let triggeredBlock = false;

    if (severity === 'serious') {
      // Squad unease: all other players suffer morale loss
      players.forEach((mate) => {
        if (mate.id === playerAId || mate.id === playerBId) return;
        updateMorale(mate.id, -5);
        if (
          getRelationshipValue(mate, playerAId) > 20 ||
          getRelationshipValue(mate, playerBId) > 20
        ) {
          updateMorale(mate.id, -5);
        }
      });

      // Check if the updated relationship drops below the block threshold
      const updatedPlayerA = useSquadStore.getState().players.find((p) => p.id === playerAId);
      if (updatedPlayerA) {
        const updatedRelationship = getRelationshipValue(updatedPlayerA, playerBId);
        triggeredBlock = updatedRelationship < -50;
        if (triggeredBlock) {
          useAltercationStore.getState().addBlock({ playerAId, playerBId, severity: 'serious' });
          newAltercationBlocks.push({ playerAId, playerBId, severity: 'serious' });
        }
      }
    }

    // Digest routing:
    //   minor            → always included in digest
    //   serious, no block → included in digest with [SERIOUS] label
    //   serious, blocked  → no inbox message; dialog surfaces it
    if (!triggeredBlock) {
      const prefix = severity === 'serious' ? '[SERIOUS] ' : '';
      digestLines.push(`${prefix}${incident.description}`);
      digestPlayerIds.add(playerAId);
      digestPlayerIds.add(playerBId);
    }
  });

  // Send one grouped behavioral digest message if there are any items
  if (digestLines.length > 0) {
    addMessage({
      id: `digest-wk${weekNumber}`,
      type: 'system',
      week: weekNumber,
      subject: 'Behavioural Report',
      body: digestLines.map((line) => `• ${line}`).join('\n'),
      isRead: false,
      metadata: { playerIds: Array.from(digestPlayerIds) },
    });
  }

  // Per-player injury incident + inbox message with severity and duration
  newInjuries.forEach(({ playerId, severity, weeksRemaining }) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    addIncident({
      id: `${playerId}-${weekNumber}-injury`,
      playerId,
      week: weekNumber,
      type: 'negative',
      description: `${player.name} picked up a ${severity} injury in training this week.`,
      traitAffected: 'consistency',
      delta: -1,
    });
    addMessage({
      id: `injury-${playerId}-wk${weekNumber}`,
      type: 'system',
      week: weekNumber,
      subject: 'Training Injury',
      body: `${player.name} picked up a ${severity} injury in training this week. Expected recovery: ${weeksRemaining} week${weeksRemaining !== 1 ? 's' : ''}.`,
      isRead: false,
      entityId: playerId,
    });
  });

  // ── 5. Loan repayments ────────────────────────────────────────────────────────
  const weeklyLoanRepayment = totalWeeklyRepayment();
  processWeeklyRepayments();

  // ── 6. Finances ───────────────────────────────────────────────────────────────
  // Resolve this club's active sponsors from market data
  const activeSponsors = allSponsors.filter((s) =>
    club.sponsorIds.includes(s.id)
  );
  const sponsorIncome = activeSponsors.reduce((sum, s) => sum + s.weeklyPayment, 0);

  const financialSummary = calculateWeeklyFinances(
    weekNumber, club, players, coaches, levels, activeSponsors, weeklyLoanRepayment, facilityTemplates,
  );

  // Balance tracks spendable cash — net is in pence, stored directly in pence
  addBalance(financialSummary.net);

  // Facility income — calculated every advance, scaled by condition + reputation
  const facilityIncomePence = calculateMatchdayIncome(facilityTemplates, levels, conditions, club.reputation);
  if (facilityIncomePence > 0) {
    addBalance(facilityIncomePence);
  }

  // HoF tracker: positive sponsor income only
  if (sponsorIncome > 0) {
    addEarnings(sponsorIncome);
  }

  // ── Ledger: record categorised transactions ────────────────────────────────
  const { addTransaction, clearOldTransactions } = useFinanceStore.getState();
  const nextWeek = weekNumber + 1; // transactions belong to the week just processed

  // All amounts stored in whole pounds for consistent ledger display
  const WAGE_LABELS = new Set(['Player wages', 'Coach salaries', 'Staff wages']);
  const wagesPounds = Math.round(
    financialSummary.breakdown
      .filter((item) => WAGE_LABELS.has(item.label))
      .reduce((sum, item) => sum + item.amount, 0) / 100,
  );
  const maintenancePounds = Math.round(
    financialSummary.breakdown
      .filter((item) => !WAGE_LABELS.has(item.label) && item.label !== 'Loan repayment')
      .reduce((sum, item) => sum + item.amount, 0) / 100,
  );
  const reputationIncome = Math.floor(club.reputation); // 0–100 scale → whole pounds
  const facilityIncomePounds = Math.round(facilityIncomePence / 100);

  if (wagesPounds > 0) {
    addTransaction({ amount: -wagesPounds,       category: 'wages',  description: `Week ${nextWeek} payroll`,              weekNumber: nextWeek });
  }
  if (maintenancePounds > 0) {
    addTransaction({ amount: -maintenancePounds, category: 'upkeep', description: `Week ${nextWeek} facility maintenance`, weekNumber: nextWeek });
  }
  if (sponsorIncome > 0) {
    addTransaction({ amount: sponsorIncome,       category: 'sponsor_payment', description: `Week ${nextWeek} sponsor income`,         weekNumber: nextWeek });
  }
  if (reputationIncome > 0) {
    addTransaction({ amount: reputationIncome,    category: 'earnings',        description: `Week ${nextWeek} reputation income`,     weekNumber: nextWeek });
  }
  if (facilityIncomePounds > 0) {
    addTransaction({ amount: facilityIncomePounds, category: 'matchday_income', description: `Week ${nextWeek} facility income`,       weekNumber: nextWeek });
  }

  clearOldTransactions();

  // ── 6b. Player development + trait shifts — ONE combined set() ──────────────
  // Re-read players to pick up injuries set in step 3b so the injury check
  // inside computePlayerDevelopment sees the current state.
  const playersWithInjuries = useSquadStore.getState().players;
  // Pass effective levels (scaled by condition) so development benefits degrade with facility wear
  const effectiveLevels: FacilityLevels = Object.fromEntries(
    Object.keys(levels).map((slug) => [slug, eff(slug)]),
  );
  const effectiveTier = getEffectiveTier(club.reputationTier, levels);
  const tierOvrCap = TIER_OVR_CEILING[effectiveTier];
  const devUpdates = computePlayerDevelopment(playersWithInjuries, coaches, effectiveLevels, weekNumber, tierOvrCap);
  applyWeeklyPlayerUpdates(traitShifts, devUpdates);

  // Decrement all active injury timers (clears expired injuries automatically)
  tickInjuries();

  // ── 6c. Monthly development snapshot (every 4 weeks) ──────────────────────────
  if (weekNumber % 4 === 0) {
    useSquadStore.getState().recordDevelopmentSnapshots(weekNumber);
  }

  // ── 7. Loss Condition Engine ──────────────────────────────────────────────────
  // Runs after all finances, development, and morale are settled for the tick.
  // Returns early (aborting the rest of the tick) if a game-over condition fires.
  {
    const {
      weeksNegativeBalance,
      weeksUnderPlayerFloor,
      weeksUnderCoachRatio,
      weeksCoachesWithFewPlayers,
      atRiskPlayers,
      atRiskCoaches,
      setWeeksNegativeBalance,
      setWeeksUnderPlayerFloor,
      setWeeksUnderCoachRatio,
      setWeeksCoachesWithFewPlayers,
      setAtRiskPlayer,
      removeAtRiskPlayer,
      setAtRiskCoach,
      removeAtRiskCoach,
      triggerGameOver,
    } = useLossConditionStore.getState();

    const { removePlayer } = useSquadStore.getState();
    const { removeCoach, updateMorale: updateCoachMorale } = useCoachStore.getState();
    const { addTransfer } = useFinanceStore.getState();
    const { setSponsorIds } = useClubStore.getState();

    // Re-read live state — morale engine (section 11) may not have run yet but
    // player/coach arrays reflect any removals that happened earlier this tick.
    const lcPlayers = useSquadStore.getState().players;
    const lcCoaches = useCoachStore.getState().coaches;

    // ── 7a. Financial Insolvency ─────────────────────────────────────────────
    if (club.balance < 0) {
      const newWeeksNeg = weeksNegativeBalance + 1;
      setWeeksNegativeBalance(newWeeksNeg);

      if (newWeeksNeg === 1) {
        addMessage({
          id: `insolvency-warn-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Club Finances Critical',
          body: 'The club is operating at a loss. Resolve this within 8 weeks or the club will be forced to close.',
          isRead: false,
        });
      }

      if (newWeeksNeg === 5) {
        const currentClub = useClubStore.getState().club;
        if (currentClub.sponsorIds.length > 0) {
          setSponsorIds(currentClub.sponsorIds.slice(1));
          addMessage({
            id: `admin-sponsor-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: 'Sponsor Withdraws',
            body: "A sponsor has pulled out due to the club's financial instability. Creditors are watching.",
            isRead: false,
          });
        }
      }

      if (newWeeksNeg >= 5 && newWeeksNeg < 9) {
        lcCoaches.forEach((coach) => updateCoachMorale(coach.id, -10));
      }

      if (newWeeksNeg >= 9) {
        triggerGameOver('insolvency');
        return {
          week: weekNumber,
          processedAt: new Date().toISOString(),
          traitShifts,
          incidents,
          financialSummary,
          weeklyXP,
          reputationDelta: 0,
          injuredPlayerIds,
        };
      }
    } else {
      setWeeksNegativeBalance(0);
    }

    // Shared flag: only one entity (player or coach) can exit per tick
    let exitProcessedThisTick = false;

    // ── 7b. Morale Exit — Players ────────────────────────────────────────────
    const sortedByMorale = [...lcPlayers].sort(
      (a, b) => (a.morale ?? 50) - (b.morale ?? 50),
    );

    for (const player of sortedByMorale) {
      const morale = player.morale ?? 50;
      const existing = atRiskPlayers[player.id];

      if (morale < 20) {
        const weeksAtRisk = (existing?.weeksAtRisk ?? 0) + 1;
        setAtRiskPlayer(player.id, { weeksAtRisk });

        if (weeksAtRisk === 1) {
          addMessage({
            id: `at-risk-player-1-${player.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${player.name} Is Unhappy`,
            body: `${player.name}'s morale has collapsed. They are considering leaving the club.`,
            isRead: false,
          });
        } else if (weeksAtRisk === 2) {
          addMessage({
            id: `at-risk-player-2-${player.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${player.name} Close to Walking Out`,
            body: `${player.name} is on the verge of leaving. Intervene immediately.`,
            isRead: false,
          });
        } else if (weeksAtRisk >= 3 && !exitProcessedThisTick) {
          removePlayer(player.id);
          removeAtRiskPlayer(player.id);
          exitProcessedThisTick = true;
          addTransfer({
            playerId: player.id,
            playerName: player.name,
            destinationClub: 'Left Club',
            grossFee: 0,
            agentCommission: 0,
            netProceeds: 0,
            type: 'free_release',
            week: weekNumber,
          });
          addMessage({
            id: `morale-exit-${player.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${player.name} Has Left`,
            body: `${player.name} walked out of the club. Their morale had been critically low for too long.`,
            isRead: false,
          });
          // A walkout damages the club's reputation
          setReputation(-1.0);
        }
      } else if (existing) {
        removeAtRiskPlayer(player.id);
        addMessage({
          id: `morale-recover-player-${player.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: `${player.name} Has Settled`,
          body: `${player.name}'s morale has recovered. They've decided to stay at the club.`,
          isRead: false,
        });
      }
    }

    // ── 7c. Morale Exit — Coaches ────────────────────────────────────────────
    const sortedCoachesByMorale = [...lcCoaches].sort(
      (a, b) => (a.morale ?? 50) - (b.morale ?? 50),
    );

    for (const coach of sortedCoachesByMorale) {
      const morale = coach.morale ?? 50;
      const existing = atRiskCoaches[coach.id];

      if (morale < 20) {
        const weeksAtRisk = (existing?.weeksAtRisk ?? 0) + 1;
        setAtRiskCoach(coach.id, { weeksAtRisk });

        if (weeksAtRisk === 1) {
          addMessage({
            id: `at-risk-coach-1-${coach.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${coach.name} Is Unhappy`,
            body: `${coach.name}'s morale has collapsed. They are considering leaving the club.`,
            isRead: false,
          });
        } else if (weeksAtRisk === 2) {
          addMessage({
            id: `at-risk-coach-2-${coach.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${coach.name} Close to Resigning`,
            body: `${coach.name} is on the verge of leaving. Intervene immediately.`,
            isRead: false,
          });
        } else if (weeksAtRisk >= 3 && !exitProcessedThisTick) {
          removeCoach(coach.id);
          removeAtRiskCoach(coach.id);
          exitProcessedThisTick = true;
          addTransfer({
            playerId: coach.id,
            playerName: coach.name,
            destinationClub: 'Resigned',
            grossFee: 0,
            agentCommission: 0,
            netProceeds: 0,
            type: 'free_release',
            week: weekNumber,
          });
          addMessage({
            id: `morale-exit-coach-${coach.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${coach.name} Has Left`,
            body: `${coach.name} walked out of the club. Their morale had been critically low for too long.`,
            isRead: false,
          });
          // A coach resignation is visible and damages the club's standing
          setReputation(-1.0);
        }
      } else if (existing) {
        removeAtRiskCoach(coach.id);
        addMessage({
          id: `morale-recover-coach-${coach.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: `${coach.name} Has Settled`,
          body: `${coach.name}'s morale has recovered. They've decided to stay at the club.`,
          isRead: false,
        });
      }
    }

    // ── 7d. Coach:Player Ratio (1:5 rule) ────────────────────────────────────
    const ratioPlayerCount = lcPlayers.length;
    const ratioCoachCount = lcCoaches.length;
    const ratioBreached =
      ratioCoachCount > 0 && ratioPlayerCount > ratioCoachCount * 5;

    if (ratioBreached) {
      const newWeeksRatio = weeksUnderCoachRatio + 1;
      setWeeksUnderCoachRatio(newWeeksRatio);

      if (newWeeksRatio === 1) {
        addMessage({
          id: `ratio-warn-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Squad Understaffed',
          body: `You have ${ratioPlayerCount} players but only ${ratioCoachCount} coach${ratioCoachCount !== 1 ? 'es' : ''}. Sign a coach within 2 weeks or a player will leave.`,
          isRead: false,
        });
      }

      if (newWeeksRatio >= 2 && !exitProcessedThisTick) {
        const lowestMoralePlayer = [...lcPlayers].sort(
          (a, b) => (a.morale ?? 50) - (b.morale ?? 50),
        )[0];
        if (lowestMoralePlayer) {
          removePlayer(lowestMoralePlayer.id);
          removeAtRiskPlayer(lowestMoralePlayer.id);
          exitProcessedThisTick = true;
          setWeeksUnderCoachRatio(0);
          addTransfer({
            playerId: lowestMoralePlayer.id,
            playerName: lowestMoralePlayer.name,
            destinationClub: 'Left Club',
            grossFee: 0,
            agentCommission: 0,
            netProceeds: 0,
            type: 'free_release',
            week: weekNumber,
          });
          addMessage({
            id: `ratio-exit-${lowestMoralePlayer.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${lowestMoralePlayer.name} Left — Overloaded Coach`,
            body: `${lowestMoralePlayer.name} left the club. There aren't enough coaches to support the squad.`,
            isRead: false,
          });
          setReputation(-1.0);
        }
      }
    } else {
      setWeeksUnderCoachRatio(0);
    }

    // ── 7e. Coaches Leave When Too Few Players ───────────────────────────────
    if (lcPlayers.length <= 3 && lcCoaches.length > 0) {
      const newWeeksCoachFew = weeksCoachesWithFewPlayers + 1;
      setWeeksCoachesWithFewPlayers(newWeeksCoachFew);

      if (newWeeksCoachFew >= 2 && !exitProcessedThisTick) {
        const lowestMoraleCoach = [...lcCoaches].sort(
          (a, b) => (a.morale ?? 50) - (b.morale ?? 50),
        )[0];
        if (lowestMoraleCoach) {
          removeCoach(lowestMoraleCoach.id);
          removeAtRiskCoach(lowestMoraleCoach.id);
          exitProcessedThisTick = true;
          setWeeksCoachesWithFewPlayers(0);
          addMessage({
            id: `coach-few-exit-${lowestMoraleCoach.id}-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: `${lowestMoraleCoach.name} Has Left`,
            body: `${lowestMoraleCoach.name} resigned — not enough players to coach at this club.`,
            isRead: false,
          });
        }
      }
    } else {
      setWeeksCoachesWithFewPlayers(0);
    }

    // ── 7f. Player Floor Game Over ───────────────────────────────────────────
    // Re-read player count to reflect any exits that fired above this tick.
    const currentPlayerCount = useSquadStore.getState().players.length;

    if (currentPlayerCount < 3) {
      const newWeeksFloor = weeksUnderPlayerFloor + 1;
      setWeeksUnderPlayerFloor(newWeeksFloor);

      if (newWeeksFloor === 1) {
        addMessage({
          id: `floor-warn-1-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Club Near Collapse',
          body: 'Fewer than 3 players remain. The club cannot continue operating at this level.',
          isRead: false,
        });
      } else if (newWeeksFloor === 2) {
        addMessage({
          id: `floor-warn-2-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Club on Life Support',
          body: 'The squad is still critically small. Sign players immediately or the club will close.',
          isRead: false,
        });
      } else if (newWeeksFloor >= 4) {
        triggerGameOver('talent_drain');
        return {
          week: weekNumber,
          processedAt: new Date().toISOString(),
          traitShifts,
          incidents,
          financialSummary,
          weeklyXP,
          reputationDelta: 0,
          injuredPlayerIds,
        };
      }
    } else {
      setWeeksUnderPlayerFloor(0);
    }
  }

  // ── 8. Reputation ─────────────────────────────────────────────────────────────
  // Passive base is a meaningful weekly driver, especially early game.
  // Scouting Center adds to this on top.
  const rep = club.reputation;
  const passiveRepDelta = calculateReputationDelta(
    eff('scouting_center'),
    config.reputationDeltaBase,
    config.reputationDeltaFacilityMultiplier,
  );

  // Tier maintenance drain — each tier requires progressively more active investment
  // to advance. This creates roughly 2× longer progression per tier:
  //   Local  (0–14):  no drain  → ~52 weeks well-managed to reach Regional
  //   Regional (15–39): –0.10   → ~104 weeks to reach National
  //   National (40–74): –0.25   → ~208 weeks to reach Elite
  //   Elite  (75–100): –0.50   → sustained Elite requires constant activity
  const tierDrain =
    rep >= 75 ? 0.50 :
    rep >= 40 ? 0.25 :
    rep >= 15 ? 0.10 :
    0;

  // Inactivity nudge — secondary penalty on top of tier drain for pure idling
  const weeksSinceActivity = weekNumber - (club.lastRepActivityWeek ?? 1);
  const inactivityDecay =
    weeksSinceActivity >= 8 ? 0.15 :
    weeksSinceActivity >= 4 ? 0.08 :
    0;

  const reputationDelta = passiveRepDelta - tierDrain - inactivityDecay;
  setReputation(reputationDelta);

  // ── 8a. Agent offers: expire stale (generation disabled) ─────────────────────
  expireOldOffers(weekNumber);
  const { agents: allAgents } = useMarketStore.getState();
  const agentOffer = generateAgentOffer(
    weekNumber, players, allAgents, club.reputation,
    useGameConfigStore.getState().config.playerFeeMultiplier,
  );
  if (agentOffer) {
    // Agents don't pursue injured players — they wait for full recovery
    const offerTarget = useSquadStore.getState().players.find((p) => p.id === agentOffer.playerId);
    if (!offerTarget?.injury) {
      addAgentOffer(agentOffer);
    }
  }

  // ── 8b. Advance week + facility decay ────────────────────────────────────────
  // Decay runs after benefits have been applied, so this week's condition is used in full
  useFacilityStore.getState().decayCondition();

  // ── 8c. Facility manager auto-repair ─────────────────────────────────────────
  // If a facility_manager is on staff and balance covers the cost, automatically
  // repair all degraded facilities (condition < 100) at end of the weekly tick.
  const facilityManager = coaches.find((c) => c.role === 'facility_manager');
  if (facilityManager) {
    const { templates: repairTemplates, levels: repairLevels, conditions: repairConditions } = useFacilityStore.getState();
    const repairedFacilities: string[] = [];

    for (const template of repairTemplates) {
      const lvl = repairLevels[template.slug] ?? 0;
      const cond = repairConditions[template.slug] ?? 100;
      if (lvl === 0 || cond >= 100) continue;

      const costPounds = repairFacilityCost(lvl, cond, template.baseCost);
      if (costPounds === 0) continue;

      const currentBalance = useClubStore.getState().club.balance; // pence
      if (currentBalance >= costPounds * 100) {
        useFacilityStore.getState().repairFacility(template.slug);
        repairedFacilities.push(template.label);
        addTransaction({
          amount: -costPounds,
          category: 'upkeep',
          description: `Auto-repair: ${template.label}`,
          weekNumber: nextWeek,
        });
      }
    }

    if (repairedFacilities.length > 0) {
      addMessage({
        id: `facility-auto-repair-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Facilities Auto-Repaired',
        body: `${facilityManager.name} handled repairs this week: ${repairedFacilities.join(', ')}.`,
        isRead: false,
      });
    }
  }

  incrementWeek();

  // ── 8c. Bi-weekly market pool refresh ─────────────────────────────────────────
  // Every 2 game weeks, replenish the market pool from the backend (fire-and-forget).
  // Bypasses the 5-min real-time cache so the pool stays topped up regardless of
  // how quickly the player advances weeks.
  if (weekNumber % 2 === 0) {
    void useMarketStore.getState().refreshMarketPool();
  }

  // ── 9. Week-1 investor offer ──────────────────────────────────────────────────
  // Only fires once: when this is the first week tick, no investor is assigned yet,
  // and no prior investor message exists in the inbox.
  if (weekNumber === 1 && !club.investorId) {
    const alreadySent = inboxMessages.some((m) => m.type === 'investor');
    if (!alreadySent) {
      // Prefer a SMALL investor from market data; fall back to any investor available.
      const smallInvestors = allInvestors.filter((inv) => inv.equityTaken <= 10);
      const investor = smallInvestors[0] ?? allInvestors[0] ?? null;

      if (investor) {
        const equityPct = 10;
        const clubValuation = calculateClubValuation(players, levels, coaches, club.balance, club.reputation);
        const rawOffer = Math.round(clubValuation * (equityPct / 100));
        const roundedOffer = Math.ceil(rawOffer / 100_000) * 100_000;
        const multiplier = Math.floor(Math.random() * 3) + 1;
        const finalOffer = roundedOffer * multiplier; // pence

        addMessage({
          id: `investor-offer-wk1-${investor.id}`,
          type: 'investor',
          week: weekNumber,
          subject: 'Investment Offer',
          body: `${investor.name} is interested in backing your club. They are offering £${(finalOffer / 100).toLocaleString()} in funding in exchange for a ${equityPct}% stake in all future player sales. This could give you the working capital to upgrade facilities and sign stronger players — but remember, every transfer fee will be shared.`,
          isRead: false,
          requiresResponse: true,
          entityId: investor.id,
          metadata: {
            investmentAmount: finalOffer, // pence
            equityPct,
            investorName: investor.name,
            investorSize: 'SMALL',
          },
        });
      }
    }
  }

  // ── 9a. Sponsor offers ────────────────────────────────────────────────────────
  // ~3% chance per week. Offer size reflects current reputation tier.
  // Does not fire if a sponsor offer is already pending a response.
  const hasPendingSponsorOffer = inboxMessages.some(
    (m) => m.type === 'sponsor' && m.requiresResponse && !m.response
  );
  if (!hasPendingSponsorOffer && Math.random() < 0.15) {
    const rep = club.reputation;
    const availableSponsors = allSponsors.filter((s) => !club.sponsorIds.includes(s.id));
    let eligibleSizes: CompanySize[];
    if (rep >= 75)      eligibleSizes = ['LARGE'];
    else if (rep >= 40) eligibleSizes = ['MEDIUM', 'LARGE'];
    else if (rep >= 15) eligibleSizes = ['SMALL', 'MEDIUM'];
    else                eligibleSizes = ['SMALL'];

    const eligible = availableSponsors.filter((s) => eligibleSizes.includes(s.companySize));
    const sponsor = eligible.length > 0
      ? eligible[Math.floor(Math.random() * eligible.length)]
      : null;

    if (sponsor) {
      const weeklyPounds = Math.round(sponsor.weeklyPayment / 100);
      addMessage({
        id: `sponsor-offer-wk${weekNumber}-${sponsor.id}`,
        type: 'sponsor',
        week: weekNumber,
        subject: 'Sponsorship Offer',
        body: `${sponsor.name} has approached your club with a sponsorship proposal. They are offering £${weeklyPounds.toLocaleString()} per week for ${sponsor.contractWeeks} weeks. Your growing reputation has caught their attention.`,
        isRead: false,
        requiresResponse: true,
        entityId: sponsor.id,
        metadata: {
          sponsorId: sponsor.id,
          sponsorName: sponsor.name,
          weeklyPayment: weeklyPounds,
          contractWeeks: sponsor.contractWeeks,
          companySize: sponsor.companySize,
        },
      });
    }
  }

  // ── 9b. Investor offers (ongoing) ─────────────────────────────────────────────
  // ~1.5% chance per week. Only fires post-week-1, when no investor is assigned,
  // no pending investor offer exists, and reputation has reached Regional tier (≥15).
  const hasPendingInvestorOffer = inboxMessages.some(
    (m) => m.type === 'investor' && m.requiresResponse && !m.response
  );
  if (
    weekNumber > 1 &&
    !club.investorId &&
    !hasPendingInvestorOffer &&
    club.reputation >= 5 &&
    Math.random() < 0.08
  ) {
    const rep = club.reputation;
    // Equity ceiling by tier: Regional→SMALL (≤10%), National→MEDIUM (≤20%), Elite→any
    const maxEquity = rep >= 75 ? 100 : rep >= 40 ? 20 : 10;
    const eligible = allInvestors.filter((inv) => inv.equityTaken <= maxEquity);
    const investor = eligible.length > 0
      ? eligible[Math.floor(Math.random() * eligible.length)]
      : null;

    if (investor) {
      const equityPct = investor.equityTaken;
      const size: CompanySize = equityPct <= 10 ? 'SMALL' : equityPct <= 20 ? 'MEDIUM' : 'LARGE';
      const clubValuation = calculateClubValuation(players, levels, coaches, club.balance, club.reputation);
      const rawOffer = Math.round(clubValuation * (equityPct / 100));
      const roundedOffer = Math.ceil(rawOffer / 100_000) * 100_000;
      const multiplier = Math.floor(Math.random() * 3) + 1;
      const finalOffer = roundedOffer * multiplier; // pence

      addMessage({
        id: `investor-offer-wk${weekNumber}-${investor.id}`,
        type: 'investor',
        week: weekNumber,
        subject: 'Investment Offer',
        body: `${investor.name} has expressed interest in backing your club. They are offering £${(finalOffer / 100).toLocaleString()} in funding in exchange for a ${equityPct}% stake in all future player sales. Your growing reputation has made you an attractive proposition.`,
        isRead: false,
        requiresResponse: true,
        entityId: investor.id,
        metadata: {
          investmentAmount: finalOffer, // pence
          equityPct,
          investorName: investor.name,
          investorSize: size,
        },
      });
    }
  }

  // ── 10. Scouting progression ──────────────────────────────────────────────────
  processScoutingTasks();
  processMissions();
  refreshMarketOffers();

  // ── 11. Relationship & morale ─────────────────────────────────────────────────
  processMoraleAndRelationships();

  // ── 12. Social graph — NPC training incidents ─────────────────────────────────
  processSocialGraph();

  // ── 13. Guardian tick ─────────────────────────────────────────────────────────
  processGuardianTick(weekNumber);

  return {
    week: weekNumber,
    processedAt: new Date().toISOString(),
    traitShifts,
    incidents,
    financialSummary,
    weeklyXP,
    reputationDelta,
    injuredPlayerIds,
    unresolvedAltercations: newAltercationBlocks.length > 0 ? newAltercationBlocks : undefined,
  };
}
