import type { Player, Position } from '@/types/player';
import type { TransferOffer } from '@/types/market';
import type { WorldClub, WorldPlayer } from '@/types/world';
import { uuidv7 } from '@/utils/uuidv7';
import { useWorldStore } from '@/stores/worldStore';

// ─── Tier mapping ─────────────────────────────────────────────────────────────

/**
 * Converts a WorldClub's numeric league tier (1 = top flight, higher = lower league)
 * to the app's 0–3 scale (local=0, regional=1, national=2, elite=3).
 */
export function worldTierToAppTier(worldTier: number): number {
  if (worldTier <= 2) return 3;
  if (worldTier <= 4) return 2;
  if (worldTier <= 6) return 1;
  return 0;
}

// ─── Transfer value ───────────────────────────────────────────────────────────

const POTENTIAL_MULTIPLIER: Record<number, number> = {
  1: 0.8,
  2: 0.95,
  3: 1.1,
  4: 1.3,
  5: 1.5,
};

function ageFactor(age: number): number {
  if (age <= 17) return 1.4;
  if (age <= 21) return 1.4 - (age - 17) * 0.1; // 1.4 → 1.0
  return Math.max(0.2, 1.0 - (age - 21) * 0.1);  // 1.0 → decays
}

/**
 * Calculate a player's transfer market value in pence.
 * Formula: overallRating × 1000 × ageFactor × potentialMultiplier
 */
export function calculateTransferValue(player: Player): number {
  const age    = player.age ?? 17;
  // potential is always 1–5; ?? 1.0 guards against legacy or malformed API data
  const potMul = POTENTIAL_MULTIPLIER[player.potential] ?? 1.0;
  return Math.round(player.overallRating * 1000 * ageFactor(age) * potMul);
}

// ─── Formation targets ────────────────────────────────────────────────────────

/**
 * Squad-size targets (min/max players per position) for each supported formation.
 * Position keys use the app's Position type: GK | DEF | MID | FWD
 */
const FORMATION_TARGETS: Record<string, Record<Position, { min: number; max: number }>> = {
  '4-4-2':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 8, max: 12 },  FWD: { min: 4, max: 6  } },
  '4-3-3':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 6, max: 9  },  FWD: { min: 6, max: 9  } },
  '4-2-3-1': { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 6, max: 10 },  FWD: { min: 4, max: 6  } },
  '3-5-2':   { GK: { min: 1, max: 2 }, DEF: { min: 6, max: 9  }, MID: { min: 10, max: 15 }, FWD: { min: 4, max: 6  } },
  '5-3-2':   { GK: { min: 1, max: 2 }, DEF: { min: 10, max: 15 }, MID: { min: 6, max: 9  }, FWD: { min: 4, max: 6  } },
  '4-5-1':   { GK: { min: 1, max: 2 }, DEF: { min: 8, max: 12 }, MID: { min: 10, max: 15 }, FWD: { min: 2, max: 4  } },
};

/**
 * Return squad-size targets per position for a given formation string.
 * Falls back to 4-4-2 for unknown formations.
 */
export function getFormationTargets(formation: string): Record<Position, { min: number; max: number }> {
  return FORMATION_TARGETS[formation] ?? FORMATION_TARGETS['4-4-2'];
}

// ─── NPC Bids ─────────────────────────────────────────────────────────────────

/**
 * Generate NPC club bids on AMP squad players for the current week.
 *
 * @param weekNumber            Current game week
 * @param ampTier               AMP club's 0–3 numeric tier (via TIER_ORDER)
 * @param players               AMP's active squad
 * @param worldClubs            All WorldClub objects keyed by id from worldStore
 * @param pendingOfferPlayerIds Player IDs that already have a pending transfer_offer inbox message
 */
export function generateNPCBids(
  weekNumber: number,
  ampTier: number,
  players: Player[],
  worldClubs: Record<string, WorldClub>,
  pendingOfferPlayerIds: Set<string>,
): TransferOffer[] {
  const eligibleClubs = Object.values(worldClubs).filter(
    (c) => Math.abs(worldTierToAppTier(c.tier) - ampTier) <= 1,
  );
  if (eligibleClubs.length === 0) return [];

  const offers: TransferOffer[] = [];

  for (const player of players) {
    if (!player.isActive) continue;
    if (player.status && player.status !== 'active') continue;
    if (player.injury) continue;
    if (pendingOfferPlayerIds.has(player.id)) continue;

    // Probability: 5% base + 2% per OVR point above 50, capped at 40%
    const chance = Math.min(0.4, 0.05 + Math.max(0, player.overallRating - 50) * 0.02);
    if (Math.random() > chance) continue;

    const club = eligibleClubs[Math.floor(Math.random() * eligibleClubs.length)];
    const tv   = player.transferValue ?? calculateTransferValue(player);
    const fee  = Math.round(tv * (0.9 + Math.random() * 0.4));

    offers.push({
      id:              uuidv7(),
      playerId:        player.id,
      biddingClubId:   club.id,
      biddingClubName: club.name,
      biddingClubTier: club.tier,
      fee,
      weekGenerated:   weekNumber,
      expiresWeek:     weekNumber + 4,
    });
  }

  return offers;
}

// ─── NPC-to-NPC Transfers ─────────────────────────────────────────────────────

export interface NpcTransferDigest {
  weekNumber: number;
  transfers: Array<{ playerName: string; fromClub: string; toClub: string; fee: number }>;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

/** Normalize WorldPlayer position to the app's Position type ('ATT' → 'FWD'). */
function normalizeWorldPosition(pos: string): Position {
  return pos === 'ATT' ? 'FWD' : (pos as Position);
}

function worldPlayerOverall(wp: WorldPlayer): number {
  return Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6);
}

/**
 * Simulate one round of NPC-to-NPC transfers.
 * Clubs with roster deficits buy from tier-adjacent clubs with surpluses.
 * Mutates worldStore club rosters and re-persists to AsyncStorage.
 */
export async function processNPCTransfers(
  weekNumber: number,
  worldClubs: Record<string, WorldClub>,
): Promise<NpcTransferDigest> {
  const digest: NpcTransferDigest = { weekNumber, transfers: [] };

  // Work on mutable copies so in-loop reads are consistent
  const mutableClubs = Object.fromEntries(
    Object.entries(worldClubs).map(([id, c]) => [id, { ...c, players: [...c.players] }]),
  );

  for (const buyerClub of Object.values(mutableClubs)) {
    const targets   = getFormationTargets(buyerClub.formation ?? '4-4-2');
    const buyerTier = worldTierToAppTier(buyerClub.tier);

    for (const pos of POSITIONS) {
      const buyerCount = buyerClub.players.filter((p) => normalizeWorldPosition(p.position) === pos).length;
      if (buyerCount >= targets[pos].min) continue;

      const potentialSellers = Object.values(mutableClubs).filter((c) => {
        if (c.id === buyerClub.id) return false;
        if (Math.abs(worldTierToAppTier(c.tier) - buyerTier) > 1) return false;
        const sellerTargets = getFormationTargets(c.formation ?? '4-4-2');
        const sellerCount   = c.players.filter((p) => normalizeWorldPosition(p.position) === pos).length;
        return sellerCount > sellerTargets[pos].max;
      });

      if (potentialSellers.length === 0) continue;

      const seller = potentialSellers[Math.floor(Math.random() * potentialSellers.length)];

      const surplusPlayers = seller.players
        .filter((p) => normalizeWorldPosition(p.position) === pos)
        .sort((a, b) => worldPlayerOverall(b as WorldPlayer) - worldPlayerOverall(a as WorldPlayer));

      const transferPlayer = surplusPlayers[0] as WorldPlayer | undefined;
      if (!transferPlayer) continue;

      const fee = worldPlayerOverall(transferPlayer) * 1000;

      seller.players    = seller.players.filter((p) => p.id !== transferPlayer.id);
      buyerClub.players = [...buyerClub.players, { ...transferPlayer, npcClubId: buyerClub.id }];

      await useWorldStore.getState().mutateClubRoster(seller.id, seller.players as WorldPlayer[]);
      await useWorldStore.getState().mutateClubRoster(buyerClub.id, buyerClub.players as WorldPlayer[]);

      digest.transfers.push({
        playerName: `${transferPlayer.firstName} ${transferPlayer.lastName}`,
        fromClub:   seller.name,
        toClub:     buyerClub.name,
        fee,
      });
    }
  }

  return digest;
}
