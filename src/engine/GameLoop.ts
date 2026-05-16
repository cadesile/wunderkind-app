import { calculateTraitShifts } from './personality';
import { shouldRetire } from './retirementEngine';
import { calculateWeeklyFinances, calculateWeeklyWage, calculateStaffSignOnFee } from './finance';
import { renderMoney } from '@/utils/currency';
import {
  calculateWeeklyXP,
  calculateInjuryProbability,
  calculateReputationDelta,
  calculateInjuryDuration,
} from './FormulaEngine';
import { simulationService } from './SimulationService';
import { computeFacilityEffects } from './facilityEffects';

import { computePlayerDevelopment, computeCoachPerformanceScore } from './DevelopmentService';
import { processScoutingTasks, processMissions, refreshMarketOffers, assignScoutToPlayer } from './ScoutingService';
import { calculateMatchdayIncome, calculateStandIncome } from '@/utils/matchdayIncome';
import { processMoraleAndRelationships } from './MoraleEngine';
import { processSocialGraph } from './SocialGraphEngine';
import { processGuardianTick } from './GuardianEngine';
import { computeSponsorOffer, getSponsorOfferProbability, getInvestorOfferProbability } from './sponsorEngine';
import { getRelationshipValue, updatePlayerRelationship } from './RelationshipService';
import { FanEngine } from './FanEngine';
import { calculateTransferValue, generateNPCBids } from './MarketEngine';
import { useWorldStore } from '@/stores/worldStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import { uuidv7 } from '@/utils/uuidv7';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFanStore } from '@/stores/fanStore';
import { useEventStore } from '@/stores/eventStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLoanStore } from '@/stores/loanStore';
import { useMarketStore } from '@/stores/marketStore';
import { useScoutStore } from '@/stores/scoutStore';
import { ManagerBrain } from './ManagerBrain';
import { useFinanceStore } from '@/stores/financeStore';
import { useEventChainStore } from '@/stores/eventChainStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { WeeklyTick } from '@/types/game';
import type { NpcLedgerEntry } from '@/types/world';
import { FacilityLevels, repairFacilityCost } from '@/types/facility';
import { PersonalityMatrix } from '@/types/player';
import { CompanySize } from '@/types/market';
import { TIER_ORDER } from '@/types/club';
import type { ClubTier } from '@/types/club';
import { calculateClubValuation } from '@/hooks/useClubMetrics';
import { useCalendarStore } from '@/stores/calendarStore';
import { isTransferWindowOpen } from '@/utils/dateUtils';

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

  const { players: allPlayers, applyWeeklyPlayerUpdates, setPlayerInjury, tickInjuries, updateMorale } = useSquadStore.getState();
  // Only process active players — inactive players (guardian withdrawals, etc.) must not
  // generate new incidents, injuries, or trait shifts.
  const players = allPlayers.filter((p) => p.isActive !== false);
  const { club, addEarnings, setReputation, incrementWeek } = useClubStore.getState();
  const { addIncident, addMessage, messages: inboxMessages } = useInboxStore.getState();
  const { coaches } = useCoachStore.getState();
  const { scouts } = useScoutStore.getState();
  const { levels, conditions, templates: facilityTemplates } = useFacilityStore.getState();

  // Effective level = level × (condition / 100), used to scale all facility benefits
  const eff = (slug: string) => (levels[slug] ?? 0) * ((conditions[slug] ?? 100) / 100);

  // Pre-compute effective levels and aggregate gameplay effects for this tick
  const effectiveLevels: FacilityLevels = Object.fromEntries(
    Object.keys(levels).map((slug) => [slug, eff(slug)]),
  );
  const facilityEffects = computeFacilityEffects(facilityTemplates, effectiveLevels);
  const { processWeeklyRepayments, totalWeeklyRepayment } = useLoanStore.getState();
  const { sponsors: allSponsors, investors: allInvestors } = useMarketStore.getState();

  const weekNumber = club.weekNumber ?? 1;

  const injuredPlayerIds: string[] = [];
  const incidents: any[] = [];
  const traitShifts: Record<string, Record<string, number>> = {};

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

  // ── 0b. Fan Base updates ──────────────────────────────────────────────────────
  {
    const fanStore = useFanStore.getState();

    // Update fan favorite player
    const favoriteId = FanEngine.determineFanFavorite(allPlayers, weekNumber);
    fanStore.setFanFavoriteId(favoriteId);

    // Prune events older than 52 weeks
    fanStore.pruneEvents(weekNumber);

    // ── 0b.i  Form impact from previous matchday (PART 1) ────────────────────
    // Simulation runs after GameLoop, so last round's results are at currentMatchday - 1.
    const { fixtures: allFixtures, currentMatchday } = useFixtureStore.getState();
    const lastMatchday = currentMatchday - 1;
    if (lastMatchday >= 0) {
      const completedFixtures = allFixtures.filter(
        (f) => f.round === lastMatchday && f.result !== null,
      );
      for (const f of completedFixtures) {
        const r = f.result!;
        const homeWon = r.homeGoals > r.awayGoals;
        const awayWon = r.awayGoals > r.homeGoals;
        const isDraw  = r.homeGoals === r.awayGoals;

        if (homeWon) {
          fanStore.updateMorale(f.homeClubId, 3);
          fanStore.updateSentiment(f.homeClubId, 1);
        } else if (isDraw) {
          fanStore.updateMorale(f.homeClubId, -1);
        } else {
          fanStore.updateMorale(f.homeClubId, -3);
          fanStore.updateSentiment(f.homeClubId, -1);
        }

        if (awayWon) {
          fanStore.updateMorale(f.awayClubId, 3);
          fanStore.updateSentiment(f.awayClubId, 1);
        } else if (isDraw) {
          fanStore.updateMorale(f.awayClubId, -1);
        } else {
          fanStore.updateMorale(f.awayClubId, -3);
          fanStore.updateSentiment(f.awayClubId, -1);
        }
      }
    }

    // ── 0b.ii  Manager sacking demand (PART 3) ────────────────────────────────
    const ampFixtures = allFixtures.filter(
      (f) => (f.homeClubId === club.id || f.awayClubId === club.id) && f.result !== null,
    );
    const {
      managerSackingMinGames,
      managerSackingWinRatioTrigger,
      managerSackingWinRatioRecovery,
    } = config;

    if (ampFixtures.length >= managerSackingMinGames) {
      const wins = ampFixtures.filter((f) => {
        const r = f.result!;
        return (f.homeClubId === club.id && r.homeGoals > r.awayGoals)
          || (f.awayClubId === club.id && r.awayGoals > r.homeGoals);
      }).length;
      const winRatio = wins / ampFixtures.length;

      if (!fanStore.managerSackingDemandActive && winRatio < managerSackingWinRatioTrigger) {
        fanStore.setManagerSackingDemand(true);
        const alreadySent = inboxMessages.some(
          (m) => m.metadata?.systemType === 'fan_sacking_demand',
        );
        if (!alreadySent) {
          const demandTemplate = useEventStore.getState().getTemplateBySlug('fan_manager_sacking_demand');
          const winRatePct = Math.round(winRatio * 100);
          addMessage({
            id: `fan-sacking-demand-wk${weekNumber}`,
            type: 'system',
            week: weekNumber,
            subject: demandTemplate?.title ?? 'Fans Demand Change',
            body: demandTemplate?.bodyTemplate.replace('{win_rate}', String(winRatePct))
              ?? `Fans are calling for the manager to be sacked. With only a ${winRatePct}% win rate, supporters are running out of patience.`,
            isRead: false,
            metadata: { systemType: 'fan_sacking_demand', winRatio, templateSlug: 'fan_manager_sacking_demand' },
          });
        }
      } else if (fanStore.managerSackingDemandActive && winRatio >= managerSackingWinRatioRecovery) {
        fanStore.setManagerSackingDemand(false);
        fanStore.resetAttendancePenalty();
        const resolvedTemplate = useEventStore.getState().getTemplateBySlug('fan_manager_sacking_resolved');
        addMessage({
          id: `fan-sacking-resolved-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: resolvedTemplate?.title ?? 'Fan Pressure Eased',
          body: resolvedTemplate?.bodyTemplate ?? 'Fans have calmed down following improved results.',
          isRead: false,
          metadata: { systemType: 'fan_sacking_resolved', templateSlug: 'fan_manager_sacking_resolved' },
        });
      }
    }

    // Per-tick penalties while sacking demand is active
    if (fanStore.managerSackingDemandActive) {
      fanStore.updateSentiment(club.id, -1);
      fanStore.addAttendancePenalty(config.managerSackingAttendancePenaltyPerWeek);
    }

    // ── 0b.iii  Fan morale critical alert (PART 2 — FAN_MORALE_CRITICAL) ──────
    // Fires at most once per season when AMP fan morale drops below 20.
    const ampMorale = useFanStore.getState().getFanState(club.id)?.morale ?? 100;
    if (ampMorale < 20) {
      const critSeason = useLeagueStore.getState().league?.season ?? 0;
      const critMsgId  = `fan-morale-critical-s${critSeason}`;
      const alreadyFired = inboxMessages.some((m) => m.id === critMsgId);
      if (!alreadyFired) {
        const critTemplate = useEventStore.getState().getTemplateBySlug('fan_morale_critical');
        addMessage({
          id:      critMsgId,
          type:    'system',
          week:    weekNumber,
          subject: critTemplate?.title ?? 'Fan Morale Critical',
          body:    critTemplate?.bodyTemplate ?? 'Fan morale has reached a critical low. Something must change.',
          isRead:  false,
          metadata: { systemType: 'fan_morale_critical', templateSlug: 'fan_morale_critical' },
        });
      }
    }
  }

  // ── 1. XP Formula ────────────────────────────────────────────────────────────
  // Tactical Room boosts coach performance via cohesionBonusPerLevel
  const tacticalBoost = 1 + facilityEffects.cohesionBonusTotal;
  const totalCoachPerformance = coaches.reduce(
    (sum, c) => sum + computeCoachPerformanceScore(c), 0,
  ) * tacticalBoost;
  const weeklyXP = calculateWeeklyXP(facilityEffects.xpMultiplierTotal, totalCoachPerformance, config.baseXP);

  // ── 2. Injury Probability ─────────────────────────────────────────────────────
  const injuryProb = calculateInjuryProbability(facilityEffects.injuryProbabilityDelta, config.baseInjuryProbability);

  // ── 3. Personality shifts ─────────────────────────────────────────────────────
  // already defined above: const traitShifts: Record<string, Partial<PersonalityMatrix>> = {};

  players.forEach((player) => {
    traitShifts[player.id] = calculateTraitShifts(
      player,
      config.regressionUpperThreshold,
      config.regressionLowerThreshold,
    );
  });

  // Facility-driven personality growth — nudge active players toward 20 on relevant traits
  const facilityTraitNudges: Partial<PersonalityMatrix> = {
    determination:   facilityEffects.determinationGrowthTotal,
    professionalism: facilityEffects.professionalismGrowthTotal,
    ambition:        facilityEffects.ambitionGrowthTotal,
    loyalty:         facilityEffects.loyaltyGrowthTotal,
    adaptability:    facilityEffects.adaptabilityGrowthTotal,
    pressure:        facilityEffects.pressureGrowthTotal,
    temperament:     facilityEffects.temperamentGrowthTotal,
    consistency:     facilityEffects.consistencyGrowthTotal,
  };
  const traitNudgeEntries = (Object.entries(facilityTraitNudges) as [keyof PersonalityMatrix, number][])
    .filter(([, v]) => v > 0);
  if (traitNudgeEntries.length > 0) {
    players.forEach((player) => {
      if (!player.isActive) return;
      const nudges: Partial<PersonalityMatrix> = {};
      for (const [trait, delta] of traitNudgeEntries) {
        if (player.personality[trait] < 20) nudges[trait] = delta;
      }
      if (Object.keys(nudges).length > 0) {
        const existing = traitShifts[player.id] ?? {};
        const merged: Partial<PersonalityMatrix> = { ...existing };
        for (const [trait, delta] of Object.entries(nudges) as [keyof PersonalityMatrix, number][]) {
          merged[trait] = (merged[trait] ?? 0) + delta;
        }
        traitShifts[player.id] = merged;
      }
    });
  }

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
  const tickInjuredPlayerIds = injuryCandidates.slice(0, slotsAvailable);

  // Apply injuries and collect metadata for inbox messages
  type NewInjury = { playerId: string; severity: 'minor' | 'moderate' | 'serious'; weeksRemaining: number };
  const newInjuries: NewInjury[] = [];
  tickInjuredPlayerIds.forEach((id) => {
    injuredPlayerIds.push(id);
    const tier = pickInjurySeverity(INJURY_TIERS);
    const weeksRemaining = calculateInjuryDuration(tier, facilityEffects.injuryRecoveryWeeksDelta);
    setPlayerInjury(id, { severity: tier.severity, weeksRemaining, injuredWeek: weekNumber });
    newInjuries.push({ playerId: id, severity: tier.severity, weeksRemaining });
  });

  // ── 3c. AMP player condition ─────────────────────────────────────────────────
  // No match this week → all players fully recover to 100.
  // Match weeks → condition drain is applied by SimulationService AFTER the match
  //   (starting XI drops to 50–75; bench players recover to 100 there too).
  {
    const fixtureState = useFixtureStore.getState();
    const hasMatchThisWeek = fixtureState.fixtures.some(
      (f) => f.round === fixtureState.currentMatchday &&
        (f.homeClubId === club.id || f.awayClubId === club.id),
    );
    if (!hasMatchThisWeek) {
      const { updatePlayer: restoreCondition } = useSquadStore.getState();
      for (const player of players) {
        if ((player.condition ?? 100) < 100) {
          restoreCondition(player.id, { condition: 100 });
        }
      }
    }
  }

  // ── 3d. NPC player condition + injury simulation ──────────────────────────────
  // No match this week → all players in that club fully recover to 100.
  // Match weeks → condition drain applied by SimulationService after each match.
  // Injury rolls and recovery run every tick regardless of match schedule.
  {
    const worldState   = useWorldStore.getState();
    const fixtureState = useFixtureStore.getState();
    const npcClubs     = Object.values(worldState.clubs);

    for (const npcClub of npcClubs) {
      if (npcClub.players.length === 0) continue;

      const hasMatch = fixtureState.fixtures.some(
        (f) => f.round === fixtureState.currentMatchday &&
          (f.homeClubId === npcClub.id || f.awayClubId === npcClub.id),
      );

      const updatedPlayers = npcClub.players.map((p) => {
        let updated = { ...p };

        // ── Injury recovery ──────────────────────────────────────────────────
        if (updated.injury) {
          const remaining = updated.injury.weeksRemaining - 1;
          updated = remaining <= 0
            ? { ...updated, injury: undefined }
            : { ...updated, injury: { ...updated.injury, weeksRemaining: remaining } };
        }

        // ── Condition: restore to 100 on non-match weeks ─────────────────────
        if (!hasMatch && (updated.condition ?? 100) < 100) {
          updated = { ...updated, condition: 100 };
        }
        // Match week: drain applied by SimulationService post-match.

        // ── New injury roll (skip if already injured) ────────────────────────
        if (!updated.injury && Math.random() < injuryProb) {
          const tier           = pickInjurySeverity(INJURY_TIERS);
          const weeksRemaining = calculateInjuryDuration(tier, 0);
          updated = { ...updated, injury: { severity: tier.severity, weeksRemaining, injuredWeek: weekNumber } };
        }

        return updated;
      });

      worldState.updateClub(npcClub.id, { players: updatedPlayers });
    }
  }

  // ── 3e. Contract expiry ──────────────────────────────────────────────────────
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
          direction: 'out',
          position: player.position,
          destinationClub: 'Contract Expired',
          grossFee: 0,
          agentCommission: 0,
          netProceeds: 0,
          type: 'free_release',
          week: weekNumber,
          season: useLeagueStore.getState().currentSeason,
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

  // ── 3f. Staff contract expiry ─────────────────────────────────────────────
  // Mirrors player enrollment expiry. Fires inbox warnings at 12 and 4 weeks
  // remaining, applies morale decay weeks 1–11, removes the member at 0 weeks.
  {
    const { updateCoach: updateCoachRecord, removeCoach: expireCoach } = useCoachStore.getState();
    const { scouts: hiredScouts, updateScout: updateScoutRecord, removeScout: expireScout } = useScoutStore.getState();

    type StaffEntry = {
      id: string; name: string; salary: number; morale?: number;
      contractEndWeek?: number; initialContractWeeks?: number;
      _type: 'coach' | 'scout';
    };

    const allStaff: StaffEntry[] = [
      ...coaches.map((c) => ({ ...c, _type: 'coach' as const })),
      ...hiredScouts.map((s) => ({ ...s, _type: 'scout' as const })),
    ];

    for (const staff of allStaff) {
      if (staff.contractEndWeek === undefined) continue;
      const weeksRemaining = staff.contractEndWeek - weekNumber;

      if (weeksRemaining <= 0) {
        if (staff._type === 'coach') expireCoach(staff.id);
        else expireScout(staff.id);
        addMessage({
          id: `staff-expired-${staff.id}-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: `${staff.name} Has Left`,
          body: `${staff.name}'s contract has expired and they have left the club.`,
          isRead: false,
          entityId: staff.id,
        });
        continue;
      }

      // Morale decay: weeks 1–11
      if (weeksRemaining <= 11) {
        const newMorale = Math.max(0, Math.min(100, (staff.morale ?? 70) - 2));
        if (staff._type === 'coach') updateCoachRecord(staff.id, { morale: newMorale });
        else updateScoutRecord(staff.id, { morale: newMorale });
      }

      if (weeksRemaining === 12) {
        const warnId12 = `staff-warn-12-${staff.id}-wk${weekNumber}`;
        if (!useInboxStore.getState().messages.some((m) => m.id === warnId12)) {
          addMessage({
            id: warnId12,
            type: 'system',
            week: weekNumber,
            subject: 'Staff Contract Expiring Soon',
            body: `${staff.name}'s contract ends in 12 weeks. Renew it from the staff screen or they will leave the club.`,
            isRead: false,
            entityId: staff.id,
          });
        }
      }

      if (weeksRemaining === 4) {
        const warnId4 = `staff-warn-4-${staff.id}-wk${weekNumber}`;
        if (!useInboxStore.getState().messages.some((m) => m.id === warnId4)) {
          addMessage({
            id: warnId4,
            type: 'system',
            week: weekNumber,
            subject: 'Staff Contract Ending — Final Notice',
            body: `${staff.name}'s contract ends in 4 weeks. Their morale is suffering. Act now or they will leave.`,
            isRead: false,
            entityId: staff.id,
          });
        }
      }
    }
  }

  // ── 4. Injury morale impact ───────────────────────────────────────────────────
  const INJURY_MORALE_DELTA: Record<'minor' | 'moderate' | 'serious', number> = {
    minor:    -3,
    moderate: -7,
    serious:  -12,
  };

  newInjuries.forEach(({ playerId, severity }) => {
    updateMorale(playerId, INJURY_MORALE_DELTA[severity]);
  });

  // ── 5. Loan repayments ────────────────────────────────────────────────────────
  const weeklyLoanRepayment = totalWeeklyRepayment();
  processWeeklyRepayments();

  // ── 6. Finances ───────────────────────────────────────────────────────────────
  // Sponsor income comes from active contracts (pence), not the market pool's static weeklyPayment.
  // Re-read from store so expiry processing in step 0a is reflected.
  const activeContracts = useClubStore.getState().club.sponsorContracts ?? [];
  const sponsorIncomePence = activeContracts.reduce((sum, c) => sum + c.weeklyPayment, 0);

  // Pass empty sponsors array — income is handled separately below.
  const financialSummary = calculateWeeklyFinances(
    weekNumber, club, players, coaches, levels, [], weeklyLoanRepayment, facilityTemplates,
    config.playerWageMultiplier,
    scouts,
  );

  // Sponsor earnings tracker (separate from balance — career metric)
  if (sponsorIncomePence > 0) {
    addEarnings(sponsorIncomePence);
  }

  // Facility income — full on home-match weeks, reduced on non-matchday weeks.
  // Guard: simulation (and therefore actual matches) only runs when weekNumber >= 5
  // and outside the transfer window — mirror the condition in _layout.tsx so that
  // pre-season weeks and transfer-window ticks never count as matchday income.
  const { fixtures, currentMatchday } = useFixtureStore.getState();
  const isMatchSimulationWeek =
    weekNumber >= 5 &&
    !isTransferWindowOpen(useCalendarStore.getState().gameDate);
  const hasHomeMatch =
    isMatchSimulationWeek &&
    fixtures.some((f) => f.round === currentMatchday && f.homeClubId === club.id);
  const nonMatchPct = config.nonMatchFacilityIncomePercent ?? 0;
  const facilityIncomeMultiplier = hasHomeMatch ? 1.0 : nonMatchPct / 100;

  // PART 2 — Attendance modifier: scale matchday income by fan morale on home-match weeks
  const { getFanState, managerSackingAttendancePenalty } = useFanStore.getState();
  const ampFanState = getFanState(club.id);
  const fanMoraleMultiplier = hasHomeMatch ? (ampFanState?.morale ?? 60) / 100 : 1;
  const rawFacilityIncome = Math.round(
    calculateMatchdayIncome(facilityTemplates, levels, conditions, club.reputation)
      * facilityIncomeMultiplier
      * fanMoraleMultiplier,
  );

  // Stand income: attendance × ticket price — home matches only
  const { ticketPrice } = useFacilityStore.getState();
  const rawStandIncome = hasHomeMatch
    ? Math.round(
        calculateStandIncome(facilityTemplates, levels, conditions, club.reputationTier, ticketPrice)
          * fanMoraleMultiplier,
      )
    : 0;

  // Deduct accumulated sacking-demand attendance penalty on home-match weeks
  const penaltyDeduction = hasHomeMatch ? managerSackingAttendancePenalty : 0;
  const facilityIncomePence = Math.max(0, rawFacilityIncome + rawStandIncome - penaltyDeduction);

  // ── Ledger: record categorised transactions ────────────────────────────────
  // addTransaction is the source of truth — it drives addBalance automatically.
  const { addTransaction, clearOldTransactions } = useFinanceStore.getState();
  const nextWeek = weekNumber + 1; // transactions belong to the week just processed

  // All amounts stored in pence for consistent ledger
  const WAGE_LABELS = new Set(['Player wages', 'Coach salaries', 'Scout salaries', 'Staff wages']);
  const wagesPence = Math.round(
    financialSummary.breakdown
      .filter((item) => WAGE_LABELS.has(item.label))
      .reduce((sum, item) => sum + item.amount, 0)
  );
  const maintenancePence = Math.round(
    financialSummary.breakdown
      .filter((item) => !WAGE_LABELS.has(item.label) && item.label !== 'Loan repayment')
      .reduce((sum, item) => sum + item.amount, 0)
  );
  const facilityIncomePenceVal = Math.round(facilityIncomePence);

  if (wagesPence > 0) {
    addTransaction({ amount: -wagesPence,       category: 'wages',  description: `Week ${nextWeek} payroll`,              weekNumber: nextWeek });
  }
  if (maintenancePence > 0) {
    addTransaction({ amount: -maintenancePence, category: 'upkeep', description: `Week ${nextWeek} facility maintenance`, weekNumber: nextWeek });
  }
  if (weeklyLoanRepayment > 0) {
    addTransaction({ amount: -Math.round(weeklyLoanRepayment), category: 'loan_repayment', description: `Week ${nextWeek} loan repayment`, weekNumber: nextWeek });
  }
  if (sponsorIncomePence > 0) {
    addTransaction({ amount: Math.round(sponsorIncomePence), category: 'sponsor_payment', description: `Week ${nextWeek} sponsor income`, weekNumber: nextWeek });
  }
  const facilityDesc = hasHomeMatch
    ? `Week ${nextWeek} facility income (matchday)`
    : `Week ${nextWeek} facility income (${nonMatchPct}% non-matchday)`;
  if (facilityIncomePenceVal > 0) {
    addTransaction({ amount: facilityIncomePenceVal, category: 'matchday_income', description: facilityDesc, weekNumber: nextWeek });
  }

  clearOldTransactions();

  // ── 6a. NPC club wage deductions ──────────────────────────────────────────────
  // Deduct each NPC club's weekly squad wage bill from their in-memory balance
  // and append a ledger entry. Balance/ledger live in-memory only (not SQLite).
  {
    const worldState = useWorldStore.getState();
    const npcClubs = Object.values(worldState.clubs);
    for (const npcClub of npcClubs) {
      if (npcClub.players.length === 0) continue;
      const weeklyWageBill = npcClub.players.reduce(
        (sum, p) => sum + (p.contractValue ?? 0), 0,
      );
      if (weeklyWageBill <= 0) continue;
      const entry: NpcLedgerEntry = {
        weekNumber,
        type: 'wage',
        amount: -weeklyWageBill,
        description: `Week ${weekNumber} squad wages (${npcClub.players.length} players)`,
      };
      const newLedger = [...npcClub.ledger, entry].slice(-52);
      worldState.updateClub(npcClub.id, {
        balance: npcClub.balance - weeklyWageBill,
        ledger: newLedger,
      });
    }
  }

  // ── 6b. Player development + trait shifts — ONE combined set() ──────────────
  // Re-read players to pick up injuries set in step 3b so the injury check
  // inside computePlayerDevelopment sees the current state.
  const playersWithInjuries = useSquadStore.getState().players;
  const devUpdates = computePlayerDevelopment(playersWithInjuries, coaches, facilityEffects, weekNumber);
  applyWeeklyPlayerUpdates(traitShifts, devUpdates);

  // Re-read players after development updates to ensure transfer values and bid
  // probabilities reflect this week's OVR changes.
  const playersCurrentTick = useSquadStore.getState().players;

  // ── Update transfer values for all active players ─────────────────────────────
  const { playerFeeMultiplier } = useGameConfigStore.getState().config;
  for (const player of playersCurrentTick.filter((p) => p.isActive)) {
    const tv = calculateTransferValue(player, playerFeeMultiplier);
    if (tv !== player.transferValue) {
      useSquadStore.getState().updatePlayer(player.id, { transferValue: tv });
    }
  }

  // ── NPC club bids on AMP players ──────────────────────────────────────────────
  // Transfer window is June only — skip entirely outside that month.
  if (isTransferWindowOpen(useCalendarStore.getState().gameDate)) {
    const { messages } = useInboxStore.getState();
    const pendingOfferPlayerIds = new Set(
      messages
        .filter((m) => m.type === 'transfer_offer' && !m.response)
        .map((m) => m.entityId)
        .filter((id): id is string => !!id),
    );

    const { clubs } = useWorldStore.getState();
    const tierKey = club.reputationTier.toLowerCase();
    const ampTierNumeric = tierKey in TIER_ORDER ? TIER_ORDER[tierKey as ClubTier] : 0;

    const npcBids = generateNPCBids(
      weekNumber,
      ampTierNumeric,
      playersCurrentTick.filter((p) => p.isActive !== false),
      clubs,
      pendingOfferPlayerIds,
      playerFeeMultiplier,
    );

    const dof = coaches.find((c) => c.role === 'director_of_football');
    const dofAutoSell = dof?.dofAutoSellPlayers ?? false;
    const manager = coaches.find((c) => c.role === 'manager');

    for (const bid of npcBids) {
      if (dofAutoSell) {
        // DOF intercepts — auto-decide based on manager opinion
        const biddingPlayer = playersCurrentTick.find((p) => p.id === bid.playerId);
        if (!biddingPlayer) continue;

        // Never sell below the minimum squad floor
        const activeSquadSize = useSquadStore.getState().players.filter((p) => p.isActive !== false).length;
        if (activeSquadSize <= config.squadSizeMin) continue;

        const opinion = manager
          ? ManagerBrain.assessTransferOffer(
              manager,
              biddingPlayer,
              {
                id:              uuidv7(),
                playerId:        bid.playerId,
                biddingClubId:   bid.biddingClubId,
                biddingClubName: bid.biddingClubName,
                biddingClubTier: bid.biddingClubTier,
                fee:             bid.fee,
                weekGenerated:   weekNumber,
                expiresWeek:     bid.expiresWeek,
              },
              club.balance ?? 0,
              playersCurrentTick.filter((p) => p.isActive !== false),
              club.formation ?? '4-4-2',
            )
          : null;

        if (opinion?.recommendation === 'sell') {
          addEarnings(bid.fee);
          useFinanceStore.getState().addTransaction({
            amount:      bid.fee, // pence
            category:    'transfer_fee',
            description: `Transfer: ${biddingPlayer.name} → ${bid.biddingClubName}`,
            weekNumber,
          });
          useFinanceStore.getState().addTransfer({
            playerId:        bid.playerId,
            playerName:      biddingPlayer.name,
            direction:       'out',
            position:        biddingPlayer.position,
            destinationClub: bid.biddingClubName,
            grossFee:        bid.fee,
            agentCommission: 0,
            netProceeds:     bid.fee,
            type:            'sale',
            week:            weekNumber,
            season:          useLeagueStore.getState().currentSeason,
          });
          useSquadStore.getState().removePlayer(bid.playerId);

          // Add sold player to the NPC club's world roster
          {
            const { clubs, mutateClubRoster } = useWorldStore.getState();
            const npcClub = clubs[bid.biddingClubId];
            if (npcClub) {
              const nameParts = biddingPlayer.name.split(' ');
              const lastName  = nameParts.pop() ?? '';
              const firstName = nameParts.join(' ') || lastName;
              const worldPos  = (biddingPlayer.position === 'FWD' ? 'ATT' : biddingPlayer.position) as 'GK' | 'DEF' | 'MID' | 'ATT';
              void mutateClubRoster(bid.biddingClubId, [
                ...npcClub.players,
                {
                  id:          biddingPlayer.id,
                  firstName,
                  lastName,
                  position:    worldPos,
                  nationality: biddingPlayer.nationality,
                  dateOfBirth: biddingPlayer.dateOfBirth,
                  pace:      biddingPlayer.attributes?.pace      ?? biddingPlayer.overallRating,
                  technical: biddingPlayer.attributes?.technical ?? biddingPlayer.overallRating,
                  vision:    biddingPlayer.attributes?.vision    ?? biddingPlayer.overallRating,
                  power:     biddingPlayer.attributes?.power     ?? biddingPlayer.overallRating,
                  stamina:   biddingPlayer.attributes?.stamina   ?? biddingPlayer.overallRating,
                  heart:     biddingPlayer.attributes?.heart     ?? biddingPlayer.overallRating,
                  personality: biddingPlayer.personality,
                  appearance:  biddingPlayer.appearance,
                  npcClubId:   bid.biddingClubId,
                },
              ]);
            }
          }

          useInboxStore.getState().purgeForPlayer(bid.playerId);
          useInboxStore.getState().addMessage({
            id:      `dof-sell-${bid.playerId}-wk${weekNumber}`,
            type:    'system',
            week:    weekNumber,
            subject: `${biddingPlayer.name} sold`,
            body:    `Your DOF accepted a ${renderMoney(bid.fee)} bid from ${bid.biddingClubName} for ${biddingPlayer.name} (${biddingPlayer.position}, Age ${biddingPlayer.age}). Manager's view: ${opinion.reasoning}`,
            isRead:  false,
            metadata: {
              systemType:            'dof_transfer',
              playerName:            biddingPlayer.name,
              playerPosition:        biddingPlayer.position,
              playerAge:             biddingPlayer.age,
              playerAppearance:      biddingPlayer.appearance ?? null,
              playerMorale:          biddingPlayer.morale ?? 70,
              overallRating:         biddingPlayer.overallRating ?? 0,
              fee:                   bid.fee,
              biddingClubName:       bid.biddingClubName,
              biddingClubTier:       bid.biddingClubTier,
              managerRecommendation: 'sell',
              managerReasoning:      opinion.reasoning,
            },
          });
        }
        // If 'keep', silently reject — offer expires without AMP involvement
      } else {
        useInboxStore.getState().addMessage({
          id:               uuidv7(),
          type:             'transfer_offer',
          week:             weekNumber,
          subject:          `Transfer Bid: ${bid.biddingClubName}`,
          body:             `${bid.biddingClubName} have submitted a bid for one of your players.`,
          isRead:           false,
          requiresResponse: true,
          entityId:         bid.playerId,
          metadata: {
            fee:             bid.fee,
            biddingClubId:   bid.biddingClubId,
            biddingClubName: bid.biddingClubName,
            biddingClubTier: bid.biddingClubTier,
            expiresWeek:     bid.expiresWeek,
          },
        });
      }
    }

    // ── Expire stale transfer offers (inside window guard) ────────────────────
    {
      const { messages, respond } = useInboxStore.getState();
      messages
        .filter((m) => m.type === 'transfer_offer' && !m.response)
        .filter((m) => (m.metadata?.expiresWeek as number ?? 0) <= weekNumber)
        .forEach((m) => {
          respond(m.id, 'rejected');
        });
    }
  } // end transfer window guard

  // Decrement all active injury timers (clears expired injuries automatically)
  tickInjuries();

  // ── 6c. Development snapshot — frequency controlled by facilityMaintenanceFrequencyWeeks ──
  if (weekNumber % (config.facilityMaintenanceFrequencyWeeks ?? 4) === 0) {
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
      setWeeksNegativeBalance,
      setWeeksUnderPlayerFloor,
      setWeeksUnderCoachRatio,
      setWeeksCoachesWithFewPlayers,
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

    // ── 7b. Coach:Player Ratio (1:5 rule) ────────────────────────────────────
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
          exitProcessedThisTick = true;
          setWeeksUnderCoachRatio(0);
          addTransfer({
            playerId: lowestMoralePlayer.id,
            playerName: lowestMoralePlayer.name,
            direction: 'out',
            position: lowestMoralePlayer.position,
            destinationClub: 'Left Club',
            grossFee: 0,
            agentCommission: 0,
            netProceeds: 0,
            type: 'free_release',
            week: weekNumber,
            season: useLeagueStore.getState().currentSeason,
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
    facilityTemplates,
    levels,
    conditions,
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

  // League cap deterioration — if the club's reputation exceeds the current league's cap
  // (e.g., a strong club that was relegated to a lower tier), apply a weekly -2 decay until
  // reputation reaches the cap. Gains are already suppressed by setReputation above.
  {
    const leagueCap = useLeagueStore.getState().league?.reputationCap ?? null;
    if (leagueCap !== null && useClubStore.getState().club.reputation > leagueCap) {
      setReputation(-2);
    }
  }

  // ── 8b. Advance week + facility decay ────────────────────────────────────────
  // Decay runs after benefits have been applied, so this week's condition is used in full
  useFacilityStore.getState().decayCondition();

  // ── 8b-i. Periodic facility maintenance reminder ──────────────────────────────
  // Fires every facilityMaintenanceFrequencyWeeks weeks when any built facility
  // has dropped below 60% condition. Deduped by week so it only sends once.
  if (weekNumber % (config.facilityMaintenanceFrequencyWeeks ?? 4) === 0) {
    const { templates: maintTemplates, levels: maintLevels, conditions: maintConditions } = useFacilityStore.getState();
    const degraded = maintTemplates
      .filter((t) => (maintLevels[t.slug] ?? 0) > 0 && (maintConditions[t.slug] ?? 100) < 60)
      .map((t) => t.label);

    if (degraded.length > 0) {
      const alreadySent = inboxMessages.some((m) => m.id === `facility-maint-wk${weekNumber}`);
      if (!alreadySent) {
        addMessage({
          id: `facility-maint-wk${weekNumber}`,
          type: 'system',
          week: weekNumber,
          subject: 'Facility Maintenance Required',
          body: `${degraded.join(', ')} ${degraded.length === 1 ? 'is' : 'are'} in poor condition. Repair from the Facilities screen to maintain performance.`,
          isRead: false,
          metadata: { systemType: 'facility_maintenance', facilities: degraded },
        });
      }
    }
  }

  // ── 8b-ii. Periodic system status notification ────────────────────────────────
  // Fires every systemNotificationFrequencyWeeks weeks. Guards against duplicates
  // by week so re-runs within the same week are no-ops.
  if (weekNumber % (config.systemNotificationFrequencyWeeks ?? 8) === 0) {
    const alreadySent = inboxMessages.some((m) => m.id === `system-status-wk${weekNumber}`);
    if (!alreadySent) {
      const degradedCount = facilityTemplates
        .filter((t) => (levels[t.slug] ?? 0) > 0 && (conditions[t.slug] ?? 100) < 80)
        .length;
      const squadSize = players.length;
      const balance = club.balance; // pence

      addMessage({
        id: `system-status-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Club Status Update',
        body: `Week ${weekNumber} summary: ${squadSize} players in squad, balance ${renderMoney(Math.abs(balance))}${balance < 0 ? ' (deficit)' : ''}${degradedCount > 0 ? `, ${degradedCount} facilit${degradedCount === 1 ? 'y' : 'ies'} need attention` : ''}.`,
        isRead: false,
        metadata: { systemType: 'system_status', weekNumber, squadSize, balance, degradedCount },
      });
    }
  }

  // ── 8c. Facility manager auto-repair ─────────────────────────────────────────
  // If a facility_manager is on staff and balance covers the cost, automatically
  // repair all degraded facilities (condition < 100) at end of the weekly tick.
  const facilityManager = coaches.find((c) => c.role === 'facility_manager');
  if (facilityManager?.facilityManagerAutoRepair) {
    const { templates: repairTemplates, levels: repairLevels, conditions: repairConditions } = useFacilityStore.getState();
    const repairedFacilities: Array<{ name: string; cost: number }> = [];

    for (const template of repairTemplates) {
      const lvl = repairLevels[template.slug] ?? 0;
      const cond = repairConditions[template.slug] ?? 100;
      if (lvl === 0 || cond >= 100) continue;

      const costPence = repairFacilityCost(lvl, cond, template.weeklyUpkeepBase);
      if (costPence === 0) continue;

      const currentBalance = useClubStore.getState().club.balance; // pence
      if (currentBalance >= costPence) {
        // resetCondition only — GameLoop handles all accounting below via addTransaction
        useFacilityStore.getState().resetCondition(template.slug);
        repairedFacilities.push({ name: template.label, cost: costPence }); // pence, for formatCurrencyWhole
        addTransaction({
          amount: -costPence, // pence for ledger
          category: 'upkeep',
          description: `Auto-repair: ${template.label}`,
          weekNumber: nextWeek,
        });
      }
    }

    if (repairedFacilities.length > 0) {
      const totalCost = repairedFacilities.reduce((sum, f) => sum + f.cost, 0);
      addMessage({
        id: `facility-auto-repair-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: 'Facilities Auto-Repaired',
        body: `${facilityManager.name} handled repairs this week.`,
        isRead: false,
        metadata: {
          systemType: 'facility_repair',
          managerName: facilityManager.name,
          items: repairedFacilities,
          totalCost,
        },
      });
    }
  }

  incrementWeek();
  useCalendarStore.getState().advanceGameDate();

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
  // Probability and payment driven by GameConfig. No offer if pending or at cap (10 sponsors).
  const hasPendingSponsorOffer = inboxMessages.some(
    (m) => m.type === 'sponsor' && m.requiresResponse && !m.response
  );
  const currentSponsorCount = (useClubStore.getState().club.sponsorContracts ?? []).length;
  const sponsorOfferProb = getSponsorOfferProbability(club.reputationTier, config);

  if (!hasPendingSponsorOffer && currentSponsorCount < 10 && Math.random() < sponsorOfferProb) {
    const rep = club.reputation;
    const activeContractIds = new Set((useClubStore.getState().club.sponsorContracts ?? []).map((c) => c.id));
    const availableSponsors = allSponsors.filter((s) => !activeContractIds.has(s.id));

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
      const offer = computeSponsorOffer(sponsor.companySize, rep, config);
      const weeklyPounds = Math.round(offer.weeklyPaymentPence / 100);
      addMessage({
        id: `sponsor-offer-wk${weekNumber}-${sponsor.id}`,
        type: 'sponsor',
        week: weekNumber,
        subject: 'Sponsorship Offer',
        body: `${sponsor.name} has approached your club with a sponsorship proposal. They are offering £${weeklyPounds.toLocaleString()} per week for ${offer.contractWeeks} weeks. Your growing reputation has caught their attention.`,
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
    Math.random() < getInvestorOfferProbability(club.reputationTier, config)
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

  // ── 14. Director of Football automations ─────────────────────────────────────
  {
    const dof = coaches.find((c) => c.role === 'director_of_football');
    if (dof) {
      const activeManager = coaches.find((c) => c.role === 'manager');

      // ── 14a. Auto-renew contracts ───────────────────────────────────────────
      // Extend contracts for players within the 12-week warning window whose
      // loyalty trait is ≥ 10 (willing to stay). One extension per player per season.
      if (dof.dofAutoRenewContracts) {
        const { extendContract } = useSquadStore.getState();

        players.forEach((player) => {
          if (player.enrollmentEndWeek === undefined) return;
          const weeksLeft = player.enrollmentEndWeek - weekNumber;
          if (weeksLeft <= 0 || weeksLeft > 12) return;
          if ((player.personality?.loyalty ?? 0) < 10) return;

          // Guard: skip if already renewed this season
          const alreadyRenewed = useInboxStore.getState().messages.some(
            (m) => m.id === `dof-renew-${player.id}-s${useLeagueStore.getState().league?.season ?? 0}`,
          );
          if (alreadyRenewed) return;

          const { wageMultiplierTiers, contractValueRandMin, contractValueRandMax } = useGameConfigStore.getState().config;
          const newWage = calculateWeeklyWage(player.overallRating ?? 0, wageMultiplierTiers, contractValueRandMin, contractValueRandMax);
          extendContract(player.id, newWage);
          addMessage({
            id:      `dof-renew-${player.id}-s${useLeagueStore.getState().league?.season ?? 0}`,
            type:    'system',
            week:    weekNumber,
            subject: `${player.name} Contract Extended`,
            body:    `${dof.name} has extended ${player.name}'s contract by one year on your behalf.`,
            isRead:  false,
            entityId: player.id,
            metadata: { systemType: 'dof_contract_renewal' },
          });
        });
      }

      // ── 14b. Auto-assign scouts ─────────────────────────────────────────────
      // Assign scouts with spare capacity to unscreened market players.
      // Each scout gets filled up to scoutMaxAssignments; fires at most once per week.
      // Scouts are paused when the squad is already at the global size cap.
      const squadAtMax = useSquadStore.getState().players.length >= config.squadSizeMax;
      if (dof.dofAutoAssignScouts && !squadAtMax) {
        const { scouts } = useScoutStore.getState();
        const { players: marketPlayers } = useMarketStore.getState();
        const { scoutMaxAssignments } = config;

        // Pool of market players that aren't yet revealed and have no scout assigned
        const unassigned = marketPlayers.filter(
          (mp) => mp.scoutingStatus !== 'revealed' && !mp.assignedScoutId,
        );

        let poolIdx = 0;
        for (const scout of scouts) {
          const workload = (scout.assignedPlayerIds ?? []).length;
          const capacity = scoutMaxAssignments - workload;
          for (let i = 0; i < capacity && poolIdx < unassigned.length; i++, poolIdx++) {
            assignScoutToPlayer(scout.id, unassigned[poolIdx].id);
          }
        }
      }

      // ── 14c. DOF auto-renew staff contracts ──────────────────────────────────
      if (dof.dofAutoRenewContracts) {
        const { staffSignOnFeePercentMin, staffSignOnFeePercentMax } = config;
        const { scouts: currentScouts } = useScoutStore.getState();
        const { updateCoach: renewCoach } = useCoachStore.getState();
        const { updateScout: renewScout } = useScoutStore.getState();

        type RenewEntry = {
          id: string; name: string; salary: number;
          contractEndWeek?: number; initialContractWeeks?: number;
          _type: 'coach' | 'scout';
        };
        const renewCandidates: RenewEntry[] = [
          ...coaches.filter((c) => c.id !== dof.id).map((c) => ({ ...c, _type: 'coach' as const })),
          ...currentScouts.map((s) => ({ ...s, _type: 'scout' as const })),
        ];

        for (const staff of renewCandidates) {
          if (staff.contractEndWeek === undefined) continue;
          const weeksLeft = staff.contractEndWeek - weekNumber;
          if (weeksLeft <= 0 || weeksLeft > 12) continue;

          // Guard: only attempt renewal once per contract (keyed by contractEndWeek)
          const guardId = `dof-staff-renew-${staff.id}-end${staff.contractEndWeek}`;
          if (useInboxStore.getState().messages.some((m) => m.id === guardId)) continue;

          const renewWeeks = staff.initialContractWeeks ?? 52;
          const signOnFee = calculateStaffSignOnFee(staff.salary, renewWeeks, staffSignOnFeePercentMin, staffSignOnFeePercentMax);
          const currentBalance = useClubStore.getState().club.balance ?? 0;

          if (currentBalance < signOnFee) {
            addMessage({
              id: guardId,
              type: 'system',
              week: weekNumber,
              subject: `${staff.name} Renewal Failed`,
              body: `${dof.name} could not renew ${staff.name}'s contract — insufficient funds. Sign-on fee required: £${Math.round(signOnFee / 100).toLocaleString()}.`,
              isRead: false,
              entityId: staff.id,
            });
            continue;
          }

          useFinanceStore.getState().addTransaction({
            amount: -signOnFee,
            category: 'staff_sign_on',
            description: `${dof.name} renewed ${staff.name}'s contract (${renewWeeks / 52} yr)`,
            weekNumber,
          });

          const newEnd = weekNumber + renewWeeks;
          if (staff._type === 'coach') renewCoach(staff.id, { contractEndWeek: newEnd, initialContractWeeks: renewWeeks });
          else renewScout(staff.id, { contractEndWeek: newEnd, initialContractWeeks: renewWeeks });

          addMessage({
            id: guardId,
            type: 'system',
            week: weekNumber,
            subject: `${staff.name} Contract Renewed`,
            body: `${dof.name} has renewed ${staff.name}'s contract for ${renewWeeks / 52} year(s). Sign-on fee of £${Math.round(signOnFee / 100).toLocaleString()} paid.`,
            isRead: false,
            entityId: staff.id,
            metadata: { systemType: 'dof_staff_contract_renewal' },
          });
        }
      }

      // ── 14d. Auto-sign players ──────────────────────────────────────────────
      // When manager's assessment is positive, sign revealed market players.
      if (dof.dofAutoSignPlayers && activeManager) {
        const { players: marketPlayers, signPlayer } = useMarketStore.getState();
        const currentSquad = useSquadStore.getState().players;
        const { balance } = useClubStore.getState().club;

        const revealed = marketPlayers.filter((mp) => mp.scoutingStatus === 'revealed');
        for (const mp of revealed) {
          // Re-read squad size each iteration — previous iterations may have signed players
          if (useSquadStore.getState().players.length >= config.squadSizeMax) break;

          const weeklyWage = mp.currentAbility * 100; // pence/wk — mirrors marketStore.signPlayer
          const { recommendation, reasoning } = ManagerBrain.assessScoutedPlayer(
            activeManager,
            mp,
            currentSquad,
            balance ?? 0,
            weeklyWage,
          );
          if (recommendation === 'sign') {
            const playerAge = mp.dateOfBirth
              ? Math.floor((Date.now() - new Date(mp.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null;
            signPlayer(mp.id);
            addMessage({
              id:      `dof-sign-${mp.id}-wk${weekNumber}`,
              type:    'system',
              week:    weekNumber,
              subject: `${mp.firstName} ${mp.lastName} Signed`,
              body:    `${dof.name} signed ${mp.firstName} ${mp.lastName} based on the manager's recommendation.`,
              isRead:  false,
              entityId: mp.id,
              metadata: {
                systemType:           'dof_signing',
                playerName:           `${mp.firstName} ${mp.lastName}`,
                playerPosition:       mp.position,
                playerAge,
                perceivedAbility:     mp.perceivedAbility ?? mp.currentAbility,
                potential:            mp.potential ?? 0,
                requiresTransferFee:  mp.requiresTransferFee ?? false,
                transferFee:          mp.transferFee,
                npcClubName:          mp.npcClubName,
                npcClubTier:          mp.npcClubTier,
                managerRecommendation: recommendation,
                managerReasoning:     reasoning,
              },
            });
          }
        }
      }
    }
  }

  // ── 15. Retirement consideration notice (last matchday of the season) ────────
  // Sends one inbox message listing AMP players who may retire at season end.
  // Deduplication is by message ID (retirement-notice-s<season>) so re-runs are safe.
  {
    const league = useLeagueStore.getState().league;
    if (league) {
      const alreadySent = useInboxStore.getState().messages.some(
        (m) => m.id === `retirement-notice-s${league.season}`,
      );
      if (!alreadySent) {
        const { fixtures, currentMatchday } = useFixtureStore.getState();
        const leagueFixtures = fixtures.filter(
          (f) => f.leagueId === league.id && f.season === league.season,
        );
        const maxRound = leagueFixtures.length > 0
          ? Math.max(...leagueFixtures.map((f) => f.round))
          : -1;

        if (maxRound >= 0 && currentMatchday === maxRound) {
          const { retirementMinAge, retirementMaxAge, retirementChance } = config;
          const gameDate = getGameDate(weekNumber);
          const retiringPlayers = players.filter((p) => {
            if (!p.dateOfBirth) return false;
            const age = computePlayerAge(p.dateOfBirth, gameDate);
            return shouldRetire(age, retirementMinAge, retirementMaxAge, retirementChance);
          });

          if (retiringPlayers.length > 0) {
            const names = retiringPlayers.map((p) => p.name).join(', ');
            const plural = retiringPlayers.length > 1;
            addMessage({
              id:      `retirement-notice-s${league.season}`,
              type:    'system',
              week:    weekNumber,
              subject: `Player${plural ? 's' : ''} Considering Retirement`,
              body:    `${names} ${plural ? 'are' : 'is'} considering retiring at the end of this season and will leave the club when the season concludes.`,
              isRead:  false,
              metadata: {
                systemType: 'retirement_notice',
                playerIds:  retiringPlayers.map((p) => p.id),
              },
            });
          }
        }
      }
    }
  }

  return {
    week: weekNumber,
    processedAt: new Date().toISOString(),
    traitShifts,
    incidents: [],
    financialSummary,
    weeklyXP,
    reputationDelta,
    injuredPlayerIds,
  };
}
