import { uuidv7 } from '@/utils/uuidv7';
import { Player } from '@/types/player';
import { Agent } from '@/types/market';
import { AgentOffer } from '@/types/narrative';

// ─── Destination club name generator ─────────────────────────────────────────

const PREFIXES  = ['FC', 'AC', 'Real', 'Sporting', 'Athletic', 'Dynamo', 'Lokomotiv'];
const CITIES    = ['Madrid', 'Milan', 'Lisboa', 'Munich', 'Paris', 'Rome', 'Lyon', 'Porto', 'Bruges', 'Utrecht', 'Graz', 'Basel', 'Braga', 'Seville', 'Dortmund'];
const SUFFIXES  = ['United', 'City', 'Athletic', 'Rangers', 'Wanderers', 'Stars'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a realistic-sounding fictional club name. */
export function generateDestinationClub(): string {
  const style = Math.floor(Math.random() * 3);
  switch (style) {
    case 0:  return `${pick(PREFIXES)} ${pick(CITIES)}`;       // "FC Munich"
    case 1:  return `${pick(CITIES)} ${pick(SUFFIXES)}`;       // "Lyon United"
    default: return `${pick(CITIES)} ${pick(PREFIXES)}`;       // "Porto AC"
  }
}

// ─── Offer generation ─────────────────────────────────────────────────────────

/**
 * Attempt to generate an agent transfer offer for the current week.
 *
 * Probability scales at 5% per active player, capped at 60%.
 * Fee = overallRating × rand(80–120) × 100 pence, scaled by reputation.
 *
 * Returns null when the probability roll fails or required data is missing.
 */
export function generateAgentOffer(
  currentWeek: number,
  players: Player[],
  agents: Agent[],
  academyReputation: number,
): AgentOffer | null {
  const activePlayers = players.filter((p) => p.isActive);

  if (activePlayers.length === 0) return null;
  if (agents.length === 0) {
    console.warn('[agentOffers] No agents in market data — skipping offer generation');
    return null;
  }

  const chance = Math.min(activePlayers.length * 0.05, 0.6);
  if (Math.random() > chance) return null;

  const player = pick(activePlayers);
  const agent  = pick(agents);

  // Fee in pence: ability × random multiplier × 100, scaled by reputation
  const multiplier    = 80 + Math.random() * 40;           // 80–120
  const reputationMod = 1 + academyReputation / 200;       // 1.0–1.5
  const estimatedFee  = Math.round(player.overallRating * multiplier * 100 * reputationMod);

  const netProceeds = Math.round(estimatedFee * (1 - agent.commissionRate / 100));

  return {
    id:                  uuidv7(),
    eventId:             uuidv7(),
    agentId:             agent.id,
    agentName:           agent.name,
    agentCommissionRate: agent.commissionRate,
    playerId:            player.id,
    playerName:          player.name,
    estimatedFee,
    netProceeds,
    destinationClub:     generateDestinationClub(),
    week:                currentWeek,
    expiresWeek:         currentWeek + 4,
    status:              'pending',
  };
}
