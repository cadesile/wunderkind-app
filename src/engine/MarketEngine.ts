import type { Player, Position } from '@/types/player';
import type { TransferOffer } from '@/types/market';
import type { WorldClub, WorldPlayer } from '@/types/world';
import { uuidv7 } from '@/utils/uuidv7';
import { useWorldStore } from '@/stores/worldStore';
import type { LeaguePlayerAbilityRanges } from '@/types/gameConfig';

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
 * Formula: overallRating × playerFeeMultiplier × ageFactor × potentialMultiplier
 */
export function calculateTransferValue(player: Player, playerFeeMultiplier = 1000): number {
  const age    = player.age ?? 17;
  // potential is always 1–5; ?? 1.0 guards against legacy or malformed API data
  const potMul = POTENTIAL_MULTIPLIER[player.potential] ?? 1.0;
  return Math.round(player.overallRating * playerFeeMultiplier * ageFactor(age) * potMul);
}

/** Derive age in years from an ISO 8601 date-of-birth string. */
function ageFromDob(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(14, age);
}

/**
 * Calculate market value in pence for a MarketPlayer or WorldPlayer.
 * Identical formula to calculateTransferValue — ensures buying and selling
 * prices are derived from the same base.
 *
 * @param currentAbility  0–100 ability (equivalent to overallRating)
 * @param potential       1–5 star potential
 * @param dateOfBirth     ISO 8601 "YYYY-MM-DD"
 * @param playerFeeMultiplier  pence per OVR point (default 1000)
 */
export function calculateMarketPlayerValue(
  currentAbility: number,
  potential: number,
  dateOfBirth: string,
  playerFeeMultiplier = 1000,
): number {
  const age    = ageFromDob(dateOfBirth);
  const potMul = POTENTIAL_MULTIPLIER[potential] ?? 1.0;
  return Math.round(currentAbility * playerFeeMultiplier * ageFactor(age) * potMul);
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
  playerFeeMultiplier = 1000,
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
    const tv   = player.transferValue || calculateTransferValue(player, playerFeeMultiplier);
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
  squadSizeMin = 11,
  squadSizeMax = 25,
  abilityRanges: LeaguePlayerAbilityRanges = [],
): Promise<NpcTransferDigest> {
  const digest: NpcTransferDigest = { weekNumber, transfers: [] };

  // Work on mutable copies so in-loop reads are consistent
  const mutableClubs = Object.fromEntries(
    Object.entries(worldClubs).map(([id, c]) => [id, { ...c, players: [...c.players] }]),
  );

  const mutatedIds = new Set<string>();

  for (const buyerClub of Object.values(mutableClubs)) {
    // Never sign if already at or above global squad cap
    if (buyerClub.players.length >= squadSizeMax) continue;

    const targets   = getFormationTargets(buyerClub.formation);
    const buyerTier = worldTierToAppTier(buyerClub.tier);

    for (const pos of POSITIONS) {
      const buyerCount = buyerClub.players.filter((p) => normalizeWorldPosition(p.position) === pos).length;
      // Buy when below min+2 (want a depth buffer, not just bare minimum)
      if (buyerCount >= targets[pos].min + 2) continue;
      // Random gate — not every eligible club buys every tick
      if (Math.random() > 0.5) continue;

      const potentialSellers = Object.values(mutableClubs).filter((c) => {
        if (c.id === buyerClub.id) return false;
        if (Math.abs(worldTierToAppTier(c.tier) - buyerTier) > 1) return false;
        // Never sell below global squad floor
        if (c.players.length <= squadSizeMin) return false;
        const sellerTargets = getFormationTargets(c.formation);
        const sellerCount   = c.players.filter((p) => normalizeWorldPosition(p.position) === pos).length;
        // Sell when above min+1 — keeps a 1-player buffer above their formation floor
        return sellerCount > sellerTargets[pos].min + 1;
      });

      if (potentialSellers.length === 0) continue;

      const seller = potentialSellers[Math.floor(Math.random() * potentialSellers.length)];

      const surplusPlayers = seller.players
        .filter((p) => normalizeWorldPosition(p.position) === pos)
        .sort((a, b) => worldPlayerOverall(b as WorldPlayer) - worldPlayerOverall(a as WorldPlayer));

      const transferPlayer = surplusPlayers[0] as WorldPlayer | undefined;
      if (!transferPlayer) continue;

      // Cosmetic proxy fee (pence) for NPC-to-NPC transfers — not gameplay-critical
      const fee = worldPlayerOverall(transferPlayer) * 1000;

      seller.players    = seller.players.filter((p) => p.id !== transferPlayer.id);
      buyerClub.players = [...buyerClub.players, { ...transferPlayer, npcClubId: buyerClub.id }];

      mutatedIds.add(seller.id);
      mutatedIds.add(buyerClub.id);

      digest.transfers.push({
        playerName: `${transferPlayer.firstName} ${transferPlayer.lastName}`,
        fromClub:   seller.name,
        toClub:     buyerClub.name,
        fee,
      });
    }
  }

  // ── Quality-upgrade pass ──────────────────────────────────────────────────
  // Clubs with a comfortable squad size occasionally sell their weakest player
  // to a smaller club and buy a stronger replacement from a tier-adjacent seller.
  // This keeps the world market alive even when positional deficits are rare.
  for (const club of Object.values(mutableClubs)) {
    // Only clubs not at capacity and with enough players to spare
    if (club.players.length < squadSizeMin + 4) continue;
    if (club.players.length >= squadSizeMax) continue;
    // ~25% chance any club triggers an upgrade this tick
    if (Math.random() > 0.25) continue;

    const clubTier = worldTierToAppTier(club.tier);

    // Find the weakest player in the squad
    const weakest = [...club.players].sort(
      (a, b) => worldPlayerOverall(a as WorldPlayer) - worldPlayerOverall(b as WorldPlayer),
    )[0] as WorldPlayer | undefined;
    if (!weakest) continue;

    const weakestPos  = normalizeWorldPosition(weakest.position);
    const weakestOvr  = worldPlayerOverall(weakest);

    // Find a tier-adjacent club with a stronger player of the same position to sell
    const upgradeSource = Object.values(mutableClubs).find((c) => {
      if (c.id === club.id) return false;
      if (Math.abs(worldTierToAppTier(c.tier) - clubTier) > 1) return false;
      if (c.players.length <= squadSizeMin) return false;
      const sourceTargets = getFormationTargets(c.formation);
      const posCount = c.players.filter((p) => normalizeWorldPosition(p.position) === weakestPos).length;
      if (posCount <= sourceTargets[weakestPos].min) return false;
      return c.players.some(
        (p) => normalizeWorldPosition(p.position) === weakestPos && worldPlayerOverall(p as WorldPlayer) > weakestOvr + 5,
      );
    });
    if (!upgradeSource) continue;

    // Pick the best available player of that position from the source
    const candidate = [...upgradeSource.players]
      .filter((p) => normalizeWorldPosition(p.position) === weakestPos)
      .sort((a, b) => worldPlayerOverall(b as WorldPlayer) - worldPlayerOverall(a as WorldPlayer))[0] as WorldPlayer | undefined;
    if (!candidate) continue;

    const fee = worldPlayerOverall(candidate) * 1000;

    // Execute swap: club sells weakest, buys candidate
    club.players          = club.players.filter((p) => p.id !== weakest.id);
    upgradeSource.players = upgradeSource.players.filter((p) => p.id !== candidate.id);
    club.players          = [...club.players, { ...candidate, npcClubId: club.id }];

    mutatedIds.add(club.id);
    mutatedIds.add(upgradeSource.id);

    digest.transfers.push({
      playerName: `${candidate.firstName} ${candidate.lastName}`,
      fromClub:   upgradeSource.name,
      toClub:     club.name,
      fee,
    });
  }

  // Flush all mutated club rosters in parallel — one write per club, not per transfer
  const storeState = useWorldStore.getState();
  await Promise.all(
    [...mutatedIds].map((id) => {
      const club = mutableClubs[id];
      return club ? storeState.mutateClubRoster(id, club.players as WorldPlayer[]) : Promise.resolve();
    }),
  );

  return digest;
}
