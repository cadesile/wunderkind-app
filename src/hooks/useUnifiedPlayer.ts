import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { Player, Position } from '@/types/player';
import { WorldPlayer } from '@/types/world';
import { useMemo } from 'react';

export interface UnifiedPlayerResult {
  player: Player | null;
  isNpc: boolean;
  clubColors?: { primary: string; secondary: string };
  clubName?: string;
}

/**
 * Hook to find a player by ID across both the user's squad and all NPC clubs in the world.
 * Standardizes NPC WorldPlayers into the full Player type for UI consistency.
 */
export function useUnifiedPlayer(id: string | undefined): UnifiedPlayerResult {
  const squadPlayer = useSquadStore((s) => 
    id ? s.players.find((p) => p.id === id) : undefined
  );

  const worldClubs = useWorldStore((s) => s.clubs);

  const npcResult = useMemo(() => {
    if (squadPlayer || !id) return null;

    for (const clubId in worldClubs) {
      const club = worldClubs[clubId];
      const wp = club.players.find((p) => p.id === id);
      if (wp) {
        return {
          player: mapWorldPlayerToPlayer(wp),
          isNpc: true,
          clubColors: { primary: club.primaryColor, secondary: club.secondaryColor },
          clubName: club.name,
        };
      }
    }
    return null;
  }, [id, worldClubs, squadPlayer]);

  if (squadPlayer) {
    return {
      player: squadPlayer,
      isNpc: false,
    };
  }

  if (npcResult) {
    return npcResult;
  }

  return { player: null, isNpc: false };
}

/**
 * Robustly maps a WorldPlayer (from world pack) to the standard Player type.
 * Includes attributes and personality matrix mapping.
 */
function mapWorldPlayerToPlayer(wp: WorldPlayer): Player {
  return {
    id: wp.id,
    name: `${wp.firstName} ${wp.lastName}`,
    dateOfBirth: wp.dateOfBirth,
    age: 20, // NPC players don't have dynamic age in world pack, default to 20
    position: (wp.position === 'ATT' ? 'FWD' : wp.position) as Position,
    nationality: wp.nationality,
    overallRating: Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6),
    morale: 50,
    potential: 3,
    wage: 0,
    personality: wp.personality,
    attributes: {
      pace: wp.pace,
      technical: wp.technical,
      vision: wp.vision,
      power: wp.power,
      stamina: wp.stamina,
      heart: wp.heart,
    },
    agentId: null,
    joinedWeek: 1,
    isActive: true,
    status: 'active',
  };
}
