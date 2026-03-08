import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useAcademyStore } from '@/stores/academyStore';
import { generateProspect } from '@/engine/recruitment';
import { getGameDate } from '@/utils/gameDate';
import { uuidv7 } from '@/utils/uuidv7';

const MAX_ASSIGNMENTS = 5;

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

  const scout = scouts.find((s) => s.id === scoutId);
  if (!scout) return false;

  const assigned = scout.assignedPlayerIds ?? [];
  if (assigned.length >= MAX_ASSIGNMENTS) return false;
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

  scouts.forEach((scout) => {
    if ((scout.morale ?? 70) < 40) return; // Low morale scouts make no progress

    const assigned = scout.assignedPlayerIds ?? [];
    assigned.forEach((playerId) => {
      const player = players.find((p) => p.id === playerId);
      if (!player || player.scoutingStatus === 'revealed') {
        removeScoutAssignment(scout.id, playerId);
        return;
      }

      const newProgress = (player.scoutingProgress ?? 0) + 1;

      if (newProgress >= 2) {
        // Reveal the player with scout-error variance
        const errorMargin = (100 - (scout.successRate ?? 50)) / 100;
        const perceivedAbility = clamp(
          player.currentAbility + Math.round(randomInt(-30, 30) * errorMargin),
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

/** Check for random "gem" discoveries — called once per weekly tick */
export function checkGemDiscovery(): void {
  const { scouts } = useScoutStore.getState();
  const { addMarketPlayer } = useMarketStore.getState();
  const { addMessage } = useInboxStore.getState();
  const { academy } = useAcademyStore.getState();

  const weekNumber = academy.weekNumber ?? 1;

  scouts.forEach((scout) => {
    if ((scout.morale ?? 70) < 40) return;

    const chance = (scout.successRate ?? 50) / 1000; // 0.04–0.09
    if (Math.random() < chance) {
      const gameDate = getGameDate(weekNumber);
      const gem = generateProspect(gameDate);
      // Override potential to 4-5 stars and boost ability
      const gemMarketPlayer = {
        id: uuidv7(),
        firstName: gem.name.split(' ')[0],
        lastName: gem.name.split(' ').slice(1).join(' '),
        dateOfBirth: gem.dateOfBirth,
        nationality: gem.nationality,
        position: gem.position,
        potential: 4 + Math.floor(Math.random() * 2), // 4-5 stars
        currentAbility: clamp(gem.overallRating + 20 + Math.floor(Math.random() * 15), 0, 99),
        personality: null as null,
        agent: null as null,
        scoutingStatus: 'revealed' as const,
        scoutingProgress: 2,
        marketValue: 0,
        currentOffer: 0,
        perceivedAbility: 0,
      };
      gemMarketPlayer.marketValue = gemMarketPlayer.currentAbility * 1000;
      gemMarketPlayer.currentOffer = gemMarketPlayer.marketValue;
      gemMarketPlayer.perceivedAbility = gemMarketPlayer.currentAbility;

      addMarketPlayer(gemMarketPlayer);

      addMessage({
        id: `gem-${gemMarketPlayer.id}-wk${weekNumber}`,
        type: 'system',
        week: weekNumber,
        subject: `${scout.name} has found a gem!`,
        body: `Your scout has identified ${gemMarketPlayer.firstName} ${gemMarketPlayer.lastName}, a highly-rated ${gemMarketPlayer.position} prospect.`,
        isRead: false,
        metadata: { playerId: gemMarketPlayer.id },
      });
    }
  });
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
