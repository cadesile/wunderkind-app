import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';
import { useProspectPoolStore } from '@/stores/prospectPoolStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { MarketPlayer } from '@/types/market';
import { getAvailableRegions } from '@/utils/scoutingRegions';
import { ACADEMY_CODE_TO_NATIONALITY } from '@/utils/nationality';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
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

      if (newProgress >= scoutRevealWeeks) {
        // Reveal the player with scout-error variance
        const errorMargin = (100 - (scout.successRate ?? 50)) / 100;
        const perceivedAbility = clamp(
          player.currentAbility + Math.round(randomInt(-scoutAbilityErrorRange, scoutAbilityErrorRange) * errorMargin),
          0,
          100,
        );
        updateMarketPlayer(playerId, {
          scoutingStatus: 'revealed',
          scoutingProgress: 2,
          perceivedAbility: isNaN(perceivedAbility) ? player.currentAbility : perceivedAbility,
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

    // 3. Pull from the backend prospect pool — never generate locally.
    //    Allowed nationalities are determined by the club's reputation tier and
    //    the scout's range. Domestic nationality is derived from club.country.
    const foundPlayers: MarketPlayer[] = [];
    if (count > 0) {
      const { prospects, consumeProspect } = useProspectPoolStore.getState();
      const { club } = useClubStore.getState();

      // Build allowed nationality set for this scout
      const availableRegions = getAvailableRegions(club.reputationTier, scout.scoutingRange);
      const domesticNationality = club.country
        ? ACADEMY_CODE_TO_NATIONALITY[club.country]
        : null;
      const poolNationalities = availableRegions
        ? availableRegions.flatMap((r) => r.nationalities)
        : [];
      const allowedNationalities = [
        ...(domesticNationality ? [domesticNationality] : []),
        ...poolNationalities,
      ];

      const byPosition = prospects.filter((p) => p.position === mission.position);

      let candidates: MarketPlayer[];
      if (allowedNationalities.length === 0) {
        candidates = byPosition;
      } else if (mission.targetNationality && allowedNationalities.includes(mission.targetNationality)) {
        // Targeted mission: prefer target nationality, then other allowed, then any position match
        const natMatch = byPosition.filter((p) => p.nationality === mission.targetNationality);
        const otherAllowed = byPosition.filter(
          (p) => allowedNationalities.includes(p.nationality) && p.nationality !== mission.targetNationality,
        );
        candidates = natMatch.length > 0 ? [...natMatch, ...otherAllowed] : byPosition;
      } else {
        // Filter by allowed nationalities — fall back to full position pool if none match
        const natFiltered = byPosition.filter((p) => allowedNationalities.includes(p.nationality));
        candidates = natFiltered.length > 0 ? natFiltered : byPosition;
      }

      const actualCount = Math.min(count, candidates.length);

      for (let i = 0; i < actualCount; i++) {
        const prospect = candidates[i];
        // Mark as revealed and flag as local gem so market refresh doesn't wipe it
        const gem: MarketPlayer = {
          ...prospect,
          scoutingStatus: 'revealed',
          scoutingProgress: 2,
          perceivedAbility: prospect.currentAbility,
          isLocalGem: true,
        };
        consumeProspect(prospect.id);
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
    if (foundPlayers.length > 0) {
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

    if (isComplete) {
      completeMission(scout.id);
      const finalGems = useScoutStore.getState().scouts.find(s => s.id === scout.id)?.activeMission?.gemsFound ?? 0;
      let completionBody = `Your scout has returned from a ${mission.weeksTotal}-week search for a ${mission.position}.`;
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
