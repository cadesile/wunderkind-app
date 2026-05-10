import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useProspectPoolStore } from '@/stores/prospectPoolStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useWorldStore } from '@/stores/worldStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { computeFacilityEffects } from './facilityEffects';
import { MarketPlayer } from '@/types/market';
import { calculateMarketPlayerValue } from '@/engine/MarketEngine';
import { getAvailableRegions } from '@/utils/scoutingRegions';
import { CLUB_CODE_TO_NATIONALITY } from '@/utils/nationality';
import { resolveAbilityRange } from '@/types/gameConfig';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return Math.max(14, age);
}

function derivePotential(age: number): number {
  if (age < 18) return 5;
  if (age < 21) return 4;
  if (age < 25) return 3;
  if (age < 29) return 2;
  return 1;
}

/**
 * Build a candidate pool from NPC club rosters in worldStore.
 * Excludes players already in the AMP squad or already visible in the market.
 * NPC candidates carry requiresTransferFee + club metadata so the signing UI
 * displays club name and tier correctly.
 */
function buildNPCCandidates(
  signedIds: Set<string>,
  marketIds: Set<string>,
): MarketPlayer[] {
  const { clubs, leagues, ampLeagueId } = useWorldStore.getState();
  const { playerFeeMultiplier } = useGameConfigStore.getState().config;

  // Only include players from NPC clubs in the same league tier as the AMP.
  // This keeps scout results immersive — a local-tier club finds local-tier players.
  const ampLeagueTier = ampLeagueId
    ? leagues.find((l) => l.id === ampLeagueId)?.tier ?? null
    : null;

  const candidates: MarketPlayer[] = [];

  for (const club of Object.values(clubs)) {
    if (ampLeagueTier !== null && club.tier !== ampLeagueTier) continue;
    for (const wp of club.players) {
      if (!wp.npcClubId) continue;
      if (signedIds.has(wp.id) || marketIds.has(wp.id)) continue;

      const avgAbility = Math.round(
        (wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6,
      );
      const age = ageFromDob(wp.dateOfBirth);
      const potential = derivePotential(age);
      const transferFee = calculateMarketPlayerValue(avgAbility, potential, wp.dateOfBirth, playerFeeMultiplier);

      candidates.push({
        id:               wp.id,
        firstName:        wp.firstName,
        lastName:         wp.lastName,
        dateOfBirth:      wp.dateOfBirth,
        nationality:      wp.nationality,
        position:         wp.position === 'ATT' ? 'FWD' : wp.position,
        currentAbility:   avgAbility,
        potential,
        personality:      wp.personality,
        agent:            null,
        scoutingStatus:   'hidden',
        scoutingProgress: 0,
        marketValue:      transferFee,
        currentOffer:     transferFee,
        perceivedAbility: avgAbility,
        isLocalGem:       true,
        requiresTransferFee: true,
        transferFee,
        npcClubName:      club.name,
        npcClubTier:      club.tier,
      });
    }
  }

  return candidates;
}

/**
 * Assign a hired scout to a market player for scouting.
 * Returns false if assignment was rejected (max capacity, already assigned, etc.)
 */
export function assignScoutToPlayer(scoutId: string, playerId: string): boolean {
  const { scouts, updateScout } = useScoutStore.getState();
  const { players, updateMarketPlayer } = useMarketStore.getState();
  const { scoutMaxAssignments } = useGameConfigStore.getState().config;

  const scout = scouts.find((s) => s.id === scoutId);
  if (!scout) return false;

  const assigned = scout.assignedPlayerIds ?? [];
  if (assigned.length >= scoutMaxAssignments) return false;
  if (assigned.includes(playerId)) return false;

  const player = players.find((p) => p.id === playerId);
  if (!player) return false;
  if (player.scoutingStatus === 'revealed') return false;

  updateScout(scoutId, { assignedPlayerIds: [...assigned, playerId] });
  updateMarketPlayer(playerId, {
    scoutingStatus: 'scouting',
    scoutingProgress: player.scoutingProgress ?? 0,
    assignedScoutId: scoutId,
  });
  return true;
}

/** Remove a scout's assignment for a player */
export function removeScoutAssignment(scoutId: string, playerId: string): void {
  const { scouts, updateScout } = useScoutStore.getState();
  const scout = scouts.find((s) => s.id === scoutId);
  if (!scout) return;

  updateScout(scoutId, {
    assignedPlayerIds: (scout.assignedPlayerIds ?? []).filter((id) => id !== playerId),
  });
}

/** Returns how many players the scout is currently assigned to */
export function getScoutWorkload(scoutId: string): number {
  const scout = useScoutStore.getState().scouts.find((s) => s.id === scoutId);
  return scout?.assignedPlayerIds?.length ?? 0;
}

/** Process scouting progress for all assigned scouts — called once per weekly tick */
export function processScoutingTasks(): void {
  const { scouts } = useScoutStore.getState();
  const { players, updateMarketPlayer } = useMarketStore.getState();

  const { scoutMoraleThreshold, scoutRevealWeeks, scoutAbilityErrorRange } =
    useGameConfigStore.getState().config;

  // Apply facility effects to scouting parameters
  const { levels: facilityLevels, conditions: facilityConditions, templates: facilityTemplates } =
    useFacilityStore.getState();
  const facilityEffLevels = Object.fromEntries(
    Object.keys(facilityLevels).map((s) => [s, (facilityLevels[s] ?? 0) * ((facilityConditions[s] ?? 100) / 100)]),
  );
  const scoutFx = computeFacilityEffects(facilityTemplates, facilityEffLevels);
  const effectiveRevealWeeks = Math.max(1, scoutRevealWeeks - scoutFx.scoutRevealWeeksDelta);
  const effectiveErrorRange  = Math.max(0, scoutAbilityErrorRange - scoutFx.scoutErrorRangeDelta);

  scouts.forEach((scout) => {
    if ((scout.morale ?? 70) < scoutMoraleThreshold) return;

    const assigned = scout.assignedPlayerIds ?? [];
    assigned.forEach((playerId) => {
      const player = players.find((p) => p.id === playerId);
      if (!player || player.scoutingStatus === 'revealed') {
        removeScoutAssignment(scout.id, playerId);
        return;
      }

      const newProgress = (player.scoutingProgress ?? 0) + 1;

      if (newProgress >= effectiveRevealWeeks) {
        // Reveal the player with scout-error variance (reduced by scouting_center effects)
        const errorMargin = (100 - (scout.successRate ?? 50)) / 100;
        const perceivedAbility = clamp(
          player.currentAbility + Math.round(randomInt(-effectiveErrorRange, effectiveErrorRange) * errorMargin),
          0,
          100,
        );

        // Check if this player belongs to an NPC club — flag transfer fee if so
        const { clubs } = useWorldStore.getState();
        let requiresTransferFee = false;
        let transferFee: number | undefined;
        let npcClubName: string | undefined;
        let npcClubTier: number | undefined;

        for (const club of Object.values(clubs)) {
          const wp = club.players.find((p) => p.id === playerId);
          if (wp && wp.npcClubId) {
            requiresTransferFee = true;
            const avgAbility = Math.round(
              (wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6,
            );
            const { playerFeeMultiplier } = useGameConfigStore.getState().config;
            transferFee = calculateMarketPlayerValue(avgAbility, 3, wp.dateOfBirth, playerFeeMultiplier);
            npcClubName = club.name;
            npcClubTier = club.tier;
            break;
          }
        }

        updateMarketPlayer(playerId, {
          scoutingStatus: 'revealed',
          scoutingProgress: effectiveRevealWeeks,
          perceivedAbility: isNaN(perceivedAbility) ? player.currentAbility : perceivedAbility,
          ...(requiresTransferFee ? { requiresTransferFee: true, transferFee, npcClubName, npcClubTier } : {}),
        });
        removeScoutAssignment(scout.id, playerId);
      } else {
        updateMarketPlayer(playerId, { scoutingProgress: newProgress });
      }
    });
  });
}

/** Process active scouting missions — called once per weekly tick */
export function processMissions(): void {
  const scouts = useScoutStore.getState().scouts;
  const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
  const { addMessage } = useInboxStore.getState();
  const { addMarketPlayer } = useMarketStore.getState();
  const { tickMission, completeMission, incrementGemsFound } = useScoutStore.getState();

  for (const scout of scouts) {
    const mission = scout.activeMission;
    if (!mission || mission.status !== 'active') continue;

    // 1. Tick the mission
    tickMission(scout.id);

    // 2. Roll for player count using config-driven thresholds
    const [t0, t1, t2, t3] = useGameConfigStore.getState().config.missionGemRollThresholds ?? [0.25, 0.75, 0.85, 0.94];
    const roll = Math.random();
    const count =
      roll >= t3 ? 4 :
      roll >= t2 ? 3 :
      roll >= t1 ? 2 :
      roll >= t0 ? 1 : 0;

    // 3. Build candidate pool: NPC club players first (world-immersive), free agents as fallback.
    //    Allowed nationalities are determined by the club's reputation tier and the scout's range.
    const foundPlayers: MarketPlayer[] = [];
    if (count > 0) {
      const { prospects, consumeProspect } = useProspectPoolStore.getState();
      const { club } = useClubStore.getState();
      const signedIds  = new Set(useSquadStore.getState().players.map((p) => p.id));
      const marketIds  = new Set(useMarketStore.getState().players.map((p) => p.id));

      // ── Tier above: free-agent pool filtered to higher-tier ability range ──
      // Scouts can surface aspirational free transfers — players whose ability
      // matches the tier above AMP's current league, available at no transfer fee.
      const { ampLeagueId, leagues } = useWorldStore.getState();
      const ampLeagueTier = ampLeagueId
        ? leagues.find((l) => l.id === ampLeagueId)?.tier ?? null
        : null;

      const higherTierFreeAgents: MarketPlayer[] = (() => {
        if (ampLeagueTier === null || ampLeagueTier <= 1) return [];
        const targetTier = ampLeagueTier - 1;
        const { leaguePlayerAbilityRanges } = useGameConfigStore.getState().config;
        const country = club.country ?? '';
        const range = resolveAbilityRange(leaguePlayerAbilityRanges, country, targetTier);
        return useProspectPoolStore.getState().prospects
          .filter((p) => !signedIds.has(p.id) && !marketIds.has(p.id))
          .filter((p) => p.currentAbility >= range.min && p.currentAbility <= range.max)
          .map((p) => ({ ...p, requiresTransferFee: false, transferFee: 0, currentOffer: 0 }));
      })();

      // Build allowed nationality set for this scout
      const availableRegions = getAvailableRegions(club.reputationTier, scout.scoutingRange);
      const domesticNationality = club.country
        ? CLUB_CODE_TO_NATIONALITY[club.country]
        : null;
      const poolNationalities = availableRegions
        ? availableRegions.flatMap((r) => r.nationalities)
        : [];
      const allowedNationalities = [
        ...(domesticNationality ? [domesticNationality] : []),
        ...poolNationalities,
      ];

      // NPC club players — primary pool for world immersion
      const npcAll = buildNPCCandidates(signedIds, marketIds);
      const npcByPosition = mission.position
        ? npcAll.filter((p) => p.position === mission.position)
        : [...npcAll];

      // Free-agent backend prospects — fallback only
      const freeAgentByPosition = mission.position
        ? prospects.filter((p) => p.position === mission.position)
        : [...prospects];

      // Higher-tier free agents — aspirational finds available as free transfers
      const higherTierByPosition = mission.position
        ? higherTierFreeAgents.filter((p) => p.position === mission.position)
        : [...higherTierFreeAgents];

      // 50% of the time use the higher-tier free-transfer pool as primary so AMP
      // gets genuinely squad-improving finds. Otherwise fall back to NPC + free agents.
      const useHigherTierPool = higherTierByPosition.length > 0 && Math.random() < 0.5;
      const combined = useHigherTierPool
        ? [...higherTierByPosition, ...npcByPosition, ...freeAgentByPosition]
        : [...npcByPosition, ...freeAgentByPosition, ...higherTierByPosition];

      let candidates: MarketPlayer[];
      if (allowedNationalities.length === 0) {
        candidates = combined;
      } else if (mission.targetNationality && allowedNationalities.includes(mission.targetNationality)) {
        const natMatch    = combined.filter((p) => p.nationality === mission.targetNationality);
        const otherAllowed = combined.filter(
          (p) => allowedNationalities.includes(p.nationality) && p.nationality !== mission.targetNationality,
        );
        candidates = natMatch.length > 0 ? [...natMatch, ...otherAllowed] : combined;
      } else {
        const natFiltered = combined.filter((p) => allowedNationalities.includes(p.nationality));
        candidates = natFiltered.length > 0 ? natFiltered : combined;
      }

      const actualCount = Math.min(count, candidates.length);

      for (let i = 0; i < actualCount; i++) {
        const prospect = candidates[i];
        const isFromProspectPool = prospects.some((p) => p.id === prospect.id);

        const gem: MarketPlayer = {
          ...prospect,
          scoutingStatus:   'revealed',
          scoutingProgress: 2,
          perceivedAbility: prospect.currentAbility,
          isLocalGem:       true,
        };

        // Only consume from the backend pool if the player came from there
        if (isFromProspectPool) consumeProspect(prospect.id);

        addMarketPlayer(gem);
        foundPlayers.push(gem);
      }
    }

    if (foundPlayers.length > 0) {
      incrementGemsFound(scout.id, foundPlayers.length);
    }

    // 4. Read updated state after tick
    const updatedScout = useScoutStore.getState().scouts.find(s => s.id === scout.id);
    const weeksElapsed = updatedScout?.activeMission?.weeksElapsed ?? mission.weeksElapsed + 1;

    // 5. Check completion
    const isComplete = weeksElapsed >= mission.weeksTotal;

    // 6. Fire inbox messages
    const dof = useCoachStore.getState().coaches.find((c) => c.role === 'director_of_football');
    const dofHandlesSigning = dof?.dofAutoSignPlayers ?? false;

    if (foundPlayers.length > 0) {
      if (dofHandlesSigning) {
        // DOF intercepts — send a brief system update; GameLoop section 14c handles sign/pass
        const names = foundPlayers.map((p) => `${p.firstName} ${p.lastName} (${p.position})`).join(', ');
        addMessage({
          id: `dof-review-${scout.id}-wk${weekNumber}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'system',
          week: weekNumber,
          subject: `DOF reviewing ${foundPlayers.length} prospect${foundPlayers.length > 1 ? 's' : ''}`,
          body: `${scout.name} found ${foundPlayers.length > 1 ? 'prospects' : 'a prospect'}: ${names}. Your Director of Football is assessing them.`,
          isRead: false,
          metadata: { gemDiscovery: true, playerIds: foundPlayers.map((p) => p.id) },
        });
      } else {
        let body = '';
        if (foundPlayers.length === 1) {
          body = `${scout.name} has identified ${foundPlayers[0].firstName} ${foundPlayers[0].lastName}, a highly-rated ${foundPlayers[0].position} prospect. Move fast — opportunities like this don't wait.`;
        } else if (foundPlayers.length === 2) {
          body = `${scout.name} has unearthed two prospects worth your attention: ${foundPlayers[0].firstName} ${foundPlayers[0].lastName} (${foundPlayers[0].position}) and ${foundPlayers[1].firstName} ${foundPlayers[1].lastName} (${foundPlayers[1].position}).`;
        } else if (foundPlayers.length === 3) {
          body = `${scout.name} has had a remarkable week, identifying three prospects: ${foundPlayers[0].firstName} ${foundPlayers[0].lastName} (${foundPlayers[0].position}), ${foundPlayers[1].firstName} ${foundPlayers[1].lastName} (${foundPlayers[1].position}), and ${foundPlayers[2].firstName} ${foundPlayers[2].lastName} (${foundPlayers[2].position}).`;
        } else {
          body = `${scout.name} has delivered an extraordinary report — four prospects found: ${foundPlayers[0].firstName} ${foundPlayers[0].lastName} (${foundPlayers[0].position}), ${foundPlayers[1].firstName} ${foundPlayers[1].lastName} (${foundPlayers[1].position}), ${foundPlayers[2].firstName} ${foundPlayers[2].lastName} (${foundPlayers[2].position}), and ${foundPlayers[3].firstName} ${foundPlayers[3].lastName} (${foundPlayers[3].position}).`;
        }
        addMessage({
          id: `gem-${scout.id}-wk${weekNumber}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'scout',
          week: weekNumber,
          subject: `${scout.name} has found a gem!`,
          body,
          isRead: false,
          metadata: { gemDiscovery: true, playerIds: foundPlayers.map(p => p.id) },
        });
      }
    }

    if (isComplete) {
      completeMission(scout.id);
      const finalGems = useScoutStore.getState().scouts.find(s => s.id === scout.id)?.activeMission?.gemsFound ?? 0;
      const positionLabel = mission.position ? `a ${mission.position}` : 'any position';
      let completionBody = `Your scout has returned from a ${mission.weeksTotal}-week search for ${positionLabel}.`;
      if (finalGems > 0) {
        completionBody += ` They identified ${finalGems} prospect(s) during the assignment.`;
      } else {
        completionBody += ` Unfortunately, they returned empty-handed this time.`;
      }
      addMessage({
        id: `mission-complete-${scout.id}-wk${weekNumber}`,
        type: 'scout',
        week: weekNumber,
        subject: `${scout.name} has completed their scouting mission`,
        body: completionBody,
        isRead: false,
        metadata: {
          missionSummary: {
            scoutName: scout.name,
            position: mission.position,
            targetNationality: mission.targetNationality,
            weeksTotal: mission.weeksTotal,
            gemsFound: finalGems,
          },
        },
      });
    }
  }
}

/** Regenerate market offers — 10% chance per player per week */
export function refreshMarketOffers(): void {
  const { players, updateMarketPlayer } = useMarketStore.getState();
  players.forEach((player) => {
    if (Math.random() < 0.10) {
      const baseValue = player.marketValue ?? player.currentAbility * 1000;
      const roll = Math.random();
      let newOffer: number;
      if (roll < 0.70) {
        newOffer = Math.round(baseValue * (0.90 + Math.random() * 0.20));
      } else {
        const isCheap = Math.random() < 0.5;
        newOffer = Math.round(baseValue * (isCheap
          ? (0.40 + Math.random() * 0.20)
          : (1.40 + Math.random() * 0.20)));
      }
      updateMarketPlayer(player.id, { currentOffer: newOffer });
    }
  });
}
