import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { Player, Position } from '@/types/player';
import { WorldPlayer } from '@/types/world';
import { useMemo } from 'react';

interface UnifiedPlayerResult {
  player: Player | null;
  isNpc: boolean;
  clubColors?: { primary: string; secondary: string };
  clubName?: string;
}

/**
 * Standardises a WorldPlayer (from an NPC club) into the main Player type.
 */
function mapWorldPlayerToPlayer(wp: WorldPlayer): Player {
  return {
    id: wp.id,
    name: `${wp.firstName} ${wp.lastName}`,
    dateOfBirth: wp.dateOfBirth,
    age: 18, // Fallback, usually computed from dob
    position: (wp.position === 'ATT' ? 'FWD' : wp.position) as Position,
    nationality: wp.nationality,
    overallRating: Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6),
    potential: 3, // Fallback for NPC
    wage: 0,
    personality: wp.personality,
    agentId: null,
    joinedWeek: 1,
    isActive: true,
    status: 'active',
    attributes: {
      pace: wp.pace,
      technical: wp.technical,
      vision: wp.vision,
      power: wp.power,
      stamina: wp.stamina,
      heart: wp.heart,
    },
  };
}

export function useUnifiedPlayer(id: string | null): UnifiedPlayerResult {
  const squadPlayer = useSquadStore((s) => s.players.find((p) => p.id === id));
  const worldClubs = useWorldStore((s) => s.clubs);

  return useMemo(() => {
    if (!id) return { player: null, isNpc: false };

    // 1. Check user squad
    if (squadPlayer) {
      return { player: squadPlayer, isNpc: false };
    }

    // 2. Search NPC clubs
    for (const clubId in worldClubs) {
      const club = worldClubs[clubId];
      const npcPlayer = club.players.find((p) => p.id === id);
      if (npcPlayer) {
        return {
          player: mapWorldPlayerToPlayer(npcPlayer),
          isNpc: true,
          clubColors: {
            primary: club.primaryColor,
            secondary: club.secondaryColor,
          },
          clubName: club.name,
        };
      }
    }

    return { player: null, isNpc: false };
  }, [id, squadPlayer, worldClubs]);
}
