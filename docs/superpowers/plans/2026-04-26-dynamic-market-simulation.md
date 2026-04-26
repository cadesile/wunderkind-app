# Dynamic Market Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the random agent-offer transfer system with a living NPC club hierarchy that builds squads, trades with each other, and makes direct bids on AMP players — with ManagerBrain and PlayerBrain advisory opinion cards informing the human's decisions.

**Architecture:** Pure-function engines (`MarketEngine`, `PlayerBrain`) plus `ManagerBrain` extensions are built TDD-first. Side effects (worldStore mutations, inbox messages) are wired in after the logic is tested. The advance button stays locked via the existing `startTick/endTick` block — no new flags needed.

**Tech Stack:** TypeScript, Zustand, AsyncStorage, Jest/jest-expo, React Native (NativeWind v4, Press Start 2P font)

---

## File Map

| Action | File |
|---|---|
| Delete | `src/engine/agentOffers.ts` |
| Delete | `src/utils/agentOfferHandlers.ts` |
| Modify | `src/types/narrative.ts` — remove `AgentOffer` |
| Modify | `src/types/world.ts` — add `formation`, `npcClubId` |
| Modify | `src/types/player.ts` — add `transferValue` |
| Modify | `src/types/market.ts` — add `TransferOffer`, update `MarketPlayer` |
| Modify | `src/stores/inboxStore.ts` — remove agentOffers, add `'transfer_offer'` type |
| Modify | `src/stores/worldStore.ts` — formations, npcClubId seeding, `mutateClubRoster` |
| Create | `src/engine/MarketEngine.ts` |
| Create | `src/engine/PlayerBrain.ts` |
| Create | `src/__tests__/engine/MarketEngine.test.ts` |
| Create | `src/__tests__/engine/PlayerBrain.test.ts` |
| Create | `src/__tests__/engine/ManagerBrain.test.ts` |
| Modify | `src/engine/ManagerBrain.ts` — add `assessTransferOffer`, `assessScoutedPlayer` |
| Modify | `src/engine/GameLoop.ts` — remove agent offers, add transferValue + NPC bids |
| Modify | `src/engine/ScoutingService.ts` — transfer fee flag on reveal |
| Modify | `src/stores/marketStore.ts` — remove coach perception from `signPlayer` |
| Modify | `app/(tabs)/_layout.tsx` — bi-weekly NPC transfer processing |
| Modify | `app/(tabs)/inbox.tsx` — add `TransferOfferCard`, remove agent offer UI |

---

## Task 1: Remove the Agent Offer System

**Files:**
- Delete: `src/engine/agentOffers.ts`
- Delete: `src/utils/agentOfferHandlers.ts`
- Modify: `src/types/narrative.ts`
- Modify: `src/stores/inboxStore.ts`
- Modify: `src/engine/GameLoop.ts`
- Modify: `src/stores/marketStore.ts`

- [ ] **Step 1: Delete agent offer files**

```bash
rm src/engine/agentOffers.ts src/utils/agentOfferHandlers.ts
```

- [ ] **Step 2: Remove `AgentOffer` from `src/types/narrative.ts`**

Delete lines 157–174 (the full `AgentOffer` interface block). The file still contains `EventCategory`, `TargetType`, `StatOperator`, `RelationshipType`, `SelectionLogic` — keep all of those.

- [ ] **Step 3: Remove agent offer state from `src/stores/inboxStore.ts`**

Remove from the `InboxMessageType` union — nothing yet, `'transfer_offer'` comes in Task 2.

Remove from the `InboxState` interface:
```ts
// DELETE these lines:
agentOffers: AgentOffer[];
addAgentOffer: (offer: AgentOffer) => void;
acceptAgentOffer: (offerId: string) => void;
rejectAgentOffer: (offerId: string) => void;
expireOldOffers: (currentWeek: number) => void;
```

Remove the corresponding implementations from the `create()` body (the five functions: `addAgentOffer`, `acceptAgentOffer`, `rejectAgentOffer`, `expireOldOffers`, and the `agentOffers: []` initialiser).

Remove the `AgentOffer` import from `src/types/narrative.ts` at the top.

Update `unreadCount` — remove the `pendingOffers` line:
```ts
// BEFORE:
unreadCount: () => {
  const state = get();
  const unreadMessages = state.messages.filter((m) => !m.isRead).length;
  const pendingOffers = state.agentOffers.filter((o) => o.status === 'pending').length;
  return unreadMessages + pendingOffers;
},
// AFTER:
unreadCount: () => {
  const state = get();
  return state.messages.filter((m) => !m.isRead).length;
},
```

- [ ] **Step 4: Remove agent offer calls from `src/engine/GameLoop.ts`**

Delete the import line:
```ts
import { generateAgentOffer } from './agentOffers';
```

Delete the destructure of `addAgentOffer` from `useInboxStore.getState()` (wherever it appears — search for `addAgentOffer`).

Delete the entire block (approximately lines 912–926):
```ts
// ── 8a. Agent offers: expire stale (generation disabled) ─────────────────────
expireOldOffers(weekNumber);
const { agents: allAgents } = useMarketStore.getState();
const agentOffer = generateAgentOffer(
  weekNumber, players, allAgents, club.reputation,
  useGameConfigStore.getState().config.playerFeeMultiplier,
);
if (agentOffer) {
  const offerTarget = useSquadStore.getState().players.find((p) => p.id === agentOffer.playerId);
  if (!offerTarget?.injury) {
    addAgentOffer(agentOffer);
  }
}
```

- [ ] **Step 5: Remove coach perception from `src/stores/marketStore.ts` `signPlayer`**

In `signPlayer`, delete the coach-opinion block (the entire `if (headCoach && ...)` try block that calls `getCoachPerception`). Keep everything else in `signPlayer` intact.

Also delete the import of `getCoachPerception` and `getHeadCoach` if they are no longer used elsewhere in the file.

- [ ] **Step 6: Remove agent offer UI from `app/(tabs)/inbox.tsx`**

Delete:
- The `import { handleAcceptAgentOffer, handleRejectAgentOffer } from '@/utils/agentOfferHandlers'` line
- The `import { NarrativeMessage, EventChoice, AgentOffer } from '@/types/narrative'` — replace with `import { NarrativeMessage, EventChoice } from '@/types/narrative'`
- The `AgentOfferCard` function component (lines ~37–76)
- The `AgentOfferDetail` function component (lines ~80–145)
- The `const agentOffers = useInboxStore(...)` and `const pendingOffers = ...` lines
- The `const [selectedOffer, setSelectedOffer] = useState<AgentOffer | null>(null)` line
- The `agent_offer` branch from the `ListItem` union type
- The `{selectedOffer ? <AgentOfferDetail ... /> : ...}` conditional — simplify to just `selectedInboxLive ? ...`
- The `<AgentOfferCard ... />` render in the `renderItem` callback

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors relating to `AgentOffer`, `agentOffers`, `addAgentOffer`, `expireOldOffers`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: remove agent offer system ahead of NPC market simulation"
```

---

## Task 2: Data Model Types

**Files:**
- Modify: `src/types/world.ts`
- Modify: `src/types/player.ts`
- Modify: `src/types/market.ts`
- Modify: `src/stores/inboxStore.ts`

- [ ] **Step 1: Add `formation` to `WorldClub` and `npcClubId` to `WorldPlayer` in `src/types/world.ts`**

```ts
// In WorldClub interface, add:
formation: string; // e.g. '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'

// In WorldPlayer interface, add:
npcClubId: string | null;
```

- [ ] **Step 2: Add `transferValue` to `Player` in `src/types/player.ts`**

In the `Player` interface, after `wage: number;`, add:
```ts
/** Transfer market value in pence — recalculated each weekly tick by MarketEngine */
transferValue?: number;
```

- [ ] **Step 3: Add `TransferOffer` and update `MarketPlayer` in `src/types/market.ts`**

After the existing imports, add the `TransferOffer` interface:
```ts
export interface TransferOffer {
  id: string;
  playerId: string;
  biddingClubId: string;
  biddingClubName: string;
  /** Numeric league tier from WorldClub.tier (1 = top flight) */
  biddingClubTier: number;
  /** Gross fee in pence */
  fee: number;
  weekGenerated: number;
  /** weekGenerated + 4 */
  expiresWeek: number;
}
```

In `MarketPlayer`, add two optional fields after `assignedScoutId?`:
```ts
/** True when this player belongs to an NPC club and requires a transfer fee to sign */
requiresTransferFee?: boolean;
/** Transfer fee in pence — set when scout fully reveals an NPC-club player */
transferFee?: number;
```

- [ ] **Step 4: Add `'transfer_offer'` to `InboxMessageType` in `src/stores/inboxStore.ts`**

```ts
// BEFORE:
export type InboxMessageType = 'guardian' | 'agent' | 'sponsor' | 'investor' | 'system' | 'scout' | 'development' | 'match_result';

// AFTER:
export type InboxMessageType = 'guardian' | 'agent' | 'sponsor' | 'investor' | 'system' | 'scout' | 'development' | 'match_result' | 'transfer_offer';
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/world.ts src/types/player.ts src/types/market.ts src/stores/inboxStore.ts
git commit -m "feat: add TransferOffer type, transferValue, formation, npcClubId to data models"
```

---

## Task 3: worldStore — Formation Assignment, npcClubId Seeding, Roster Mutation

**Files:**
- Modify: `src/stores/worldStore.ts`

- [ ] **Step 1: Add formation constants and `mutateClubRoster` to the `WorldState` interface**

At the top of the file, add the constant (before the `create` call):
```ts
const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'] as const;
```

In the `WorldState` interface, add:
```ts
/**
 * Update a single club's player roster and re-persist it to AsyncStorage.
 * Called by MarketEngine after NPC-to-NPC transfers.
 */
mutateClubRoster: (clubId: string, updatedPlayers: import('@/types/world').WorldPlayer[]) => Promise<void>;
```

- [ ] **Step 2: Seed formations and `npcClubId` in `setFromWorldPack`**

Inside the `for (const leagueData of pack.leagues)` loop, after each `WorldClub` is built but before it is written to `clubs[club.id]`, add:

```ts
// Assign a random formation to each NPC club
const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];

// Tag every player in this club's roster with the club's id
const playersWithClubId = leagueData.clubs
  .find((c) => c.id === leagueData.clubs[0].id) // actual club reference from pack
  ? undefined : undefined; // placeholder — see full update below
```

Replace the existing club-building logic for players inside the loop. Wherever `WorldClub` is constructed, spread in `formation` and map players to add `npcClubId`:

```ts
const club: WorldClub = {
  id: leagueData.id, // use actual field from the pack
  // ...all existing fields...
  formation,
  players: leagueClub.players.map((wp) => ({ ...wp, npcClubId: leagueClub.id })),
};
```

> **Note:** The exact field names inside the loop depend on how `leagueData.clubs` is iterated. Find the `WorldClub` object construction in `setFromWorldPack` and add `formation` and the `npcClubId` mapping to the players array. The pattern is the same in every club iteration.

- [ ] **Step 3: Implement `mutateClubRoster`**

Add to the `create()` body:
```ts
mutateClubRoster: async (clubId, updatedPlayers) => {
  const { clubs, leagues } = get();
  const club = clubs[clubId];
  if (!club) return;

  const updatedClub = { ...club, players: updatedPlayers };

  // Update in-memory map
  set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

  // Find which league this club belongs to and re-persist that league's clubs
  const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
  if (!leagueId) return;

  const leagueClubs = get().getLeagueClubs(leagueId).map((c) =>
    c.id === clubId ? updatedClub : c,
  );
  await AsyncStorage.setItem(
    `${CLUBS_KEY_PREFIX}${leagueId}`,
    JSON.stringify(leagueClubs),
  );
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/worldStore.ts
git commit -m "feat: assign random formations and seed npcClubId in worldStore"
```

---

## Task 4: MarketEngine — Pure Functions (TDD)

**Files:**
- Create: `src/engine/MarketEngine.ts`
- Create: `src/__tests__/engine/MarketEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/engine/MarketEngine.test.ts`:

```ts
import {
  worldTierToAppTier,
  calculateTransferValue,
  getFormationTargets,
} from '@/engine/MarketEngine';
import type { Player } from '@/types/player';

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    dateOfBirth: '2007-01-01',
    age: 17,
    position: 'MID',
    nationality: 'EN',
    overallRating: 50,
    potential: 3,
    wage: 10000,
    transferValue: 0,
    personality: {
      determination: 10, professionalism: 10, ambition: 10, loyalty: 10,
      adaptability: 10, pressure: 10, temperament: 10, consistency: 10,
    },
    agentId: null,
    joinedWeek: 1,
    isActive: true,
    morale: 70,
    relationships: [],
    ...overrides,
  } as Player;
}

describe('worldTierToAppTier', () => {
  it('maps tier 1 → 3 (elite)', () => expect(worldTierToAppTier(1)).toBe(3));
  it('maps tier 2 → 3 (elite)', () => expect(worldTierToAppTier(2)).toBe(3));
  it('maps tier 3 → 2 (national)', () => expect(worldTierToAppTier(3)).toBe(2));
  it('maps tier 4 → 2 (national)', () => expect(worldTierToAppTier(4)).toBe(2));
  it('maps tier 5 → 1 (regional)', () => expect(worldTierToAppTier(5)).toBe(1));
  it('maps tier 6 → 1 (regional)', () => expect(worldTierToAppTier(6)).toBe(1));
  it('maps tier 7 → 0 (local)',    () => expect(worldTierToAppTier(7)).toBe(0));
  it('maps tier 99 → 0 (local)',   () => expect(worldTierToAppTier(99)).toBe(0));
});

describe('calculateTransferValue', () => {
  it('a 17-year-old has higher value than the same player at 25', () => {
    const young = makePlayer({ age: 17 });
    const old   = makePlayer({ age: 25 });
    expect(calculateTransferValue(young)).toBeGreaterThan(calculateTransferValue(old));
  });

  it('a 5-star potential player is worth more than a 1-star at same OVR and age', () => {
    const star5 = makePlayer({ potential: 5 });
    const star1 = makePlayer({ potential: 1 });
    expect(calculateTransferValue(star5)).toBeGreaterThan(calculateTransferValue(star1));
  });

  it('returns a positive pence value', () => {
    expect(calculateTransferValue(makePlayer({}))).toBeGreaterThan(0);
  });

  it('scales with overallRating', () => {
    const hi = makePlayer({ overallRating: 80 });
    const lo = makePlayer({ overallRating: 30 });
    expect(calculateTransferValue(hi)).toBeGreaterThan(calculateTransferValue(lo));
  });
});

describe('getFormationTargets', () => {
  it('4-4-2 has MID min 8, max 12', () => {
    const t = getFormationTargets('4-4-2');
    expect(t.MID.min).toBe(8);
    expect(t.MID.max).toBe(12);
  });

  it('4-3-3 has FWD min 6, max 9', () => {
    const t = getFormationTargets('4-3-3');
    expect(t.FWD.min).toBe(6);
    expect(t.FWD.max).toBe(9);
  });

  it('unknown formation falls back to 4-4-2', () => {
    const t = getFormationTargets('invalid');
    expect(t.DEF.min).toBe(8);
  });

  it('all formations have GK min 1, max 2', () => {
    ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'].forEach((f) => {
      const t = getFormationTargets(f);
      expect(t.GK.min).toBe(1);
      expect(t.GK.max).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/engine/MarketEngine'`

- [ ] **Step 3: Implement the pure functions in `src/engine/MarketEngine.ts`**

```ts
import type { Player, Position } from '@/types/player';

// ─── Tier mapping ─────────────────────────────────────────────────────────────

/**
 * Converts a WorldClub's numeric league tier (1 = top flight, higher = lower league)
 * to the app's 0–3 scale (matching TIER_ORDER: local=0, regional=1, national=2, elite=3).
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
  return Math.max(0.2, 1.0 - (age - 21) * 0.1); // 1.0 → 0.2
}

/**
 * Calculate a player's transfer market value in pence.
 * Formula: overallRating × 1000 × ageFactor × potentialMultiplier
 */
export function calculateTransferValue(player: Player): number {
  const age    = player.age ?? 17;
  const potMul = POTENTIAL_MULTIPLIER[player.potential] ?? 1.0;
  return Math.round(player.overallRating * 1000 * ageFactor(age) * potMul);
}

// ─── Formation targets ────────────────────────────────────────────────────────

const FORMATION_TARGETS: Record<string, Record<Position, { min: number; max: number }>> = {
  '4-4-2':   { GK:{min:1,max:2}, DEF:{min:8,max:12}, MID:{min:8,max:12},  FWD:{min:4,max:6} },
  '4-3-3':   { GK:{min:1,max:2}, DEF:{min:8,max:12}, MID:{min:6,max:9},   FWD:{min:6,max:9} },
  '4-2-3-1': { GK:{min:1,max:2}, DEF:{min:8,max:12}, MID:{min:6,max:10},  FWD:{min:4,max:6} },
  '3-5-2':   { GK:{min:1,max:2}, DEF:{min:6,max:9},  MID:{min:10,max:15}, FWD:{min:4,max:6} },
  '5-3-2':   { GK:{min:1,max:2}, DEF:{min:10,max:15},MID:{min:6,max:9},   FWD:{min:4,max:6} },
  '4-5-1':   { GK:{min:1,max:2}, DEF:{min:8,max:12}, MID:{min:10,max:15}, FWD:{min:2,max:4} },
};

/**
 * Return the squad-size targets (min/max players per position) for a given formation.
 * Falls back to 4-4-2 for unknown formations.
 */
export function getFormationTargets(formation: string): Record<Position, { min: number; max: number }> {
  return FORMATION_TARGETS[formation] ?? FORMATION_TARGETS['4-4-2'];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/MarketEngine.ts src/__tests__/engine/MarketEngine.test.ts
git commit -m "feat: add MarketEngine pure functions — worldTierToAppTier, calculateTransferValue, getFormationTargets"
```

---

## Task 5: MarketEngine — generateNPCBids (TDD)

**Files:**
- Modify: `src/engine/MarketEngine.ts`
- Modify: `src/__tests__/engine/MarketEngine.test.ts`

- [ ] **Step 1: Add failing tests for `generateNPCBids`**

Append to `src/__tests__/engine/MarketEngine.test.ts`:

```ts
import { generateNPCBids } from '@/engine/MarketEngine';
import type { WorldClub } from '@/types/world';

function makeWorldClub(id: string, tier: number): WorldClub {
  return {
    id,
    name: `Club ${id}`,
    tier,
    reputation: 50,
    primaryColor: '#fff',
    secondaryColor: '#000',
    stadiumName: null,
    facilities: {},
    personality: { playingStyle: 'POSSESSION', financialApproach: 'BALANCED', managerTemperament: 10 },
    players: [],
    staff: [],
    formation: '4-4-2',
  };
}

describe('generateNPCBids', () => {
  it('returns no offers when there are no active players', () => {
    const clubs = { c1: makeWorldClub('c1', 5) };
    const offers = generateNPCBids(1, 1, [], clubs, new Set());
    expect(offers).toHaveLength(0);
  });

  it('returns no offer for a player already with a pending bid', () => {
    const player = makePlayer({ id: 'p-pending', overallRating: 80, isActive: true });
    const clubs = { c1: makeWorldClub('c1', 5) };
    const pendingIds = new Set(['p-pending']);
    // Run many times to account for randomness — if player is in pending set, never offered
    for (let i = 0; i < 50; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, pendingIds);
      expect(offers.every((o) => o.playerId !== 'p-pending')).toBe(true);
    }
  });

  it('returns no offer for an injured player', () => {
    const player = makePlayer({
      id: 'p-injured',
      overallRating: 99,
      isActive: true,
      injury: { severity: 'minor', weeksRemaining: 2, injuredWeek: 1 },
    });
    const clubs = { c1: makeWorldClub('c1', 5) };
    for (let i = 0; i < 50; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, new Set());
      expect(offers.every((o) => o.playerId !== 'p-injured')).toBe(true);
    }
  });

  it('returns at most one offer per player per call', () => {
    const player = makePlayer({ id: 'p1', overallRating: 80, isActive: true });
    const clubs = { c1: makeWorldClub('c1', 5), c2: makeWorldClub('c2', 6) };
    for (let i = 0; i < 20; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, new Set());
      const forPlayer = offers.filter((o) => o.playerId === 'p1');
      expect(forPlayer.length).toBeLessThanOrEqual(1);
    }
  });

  it('offer fee is within 0.9–1.3× the player transferValue', () => {
    // Force a high-probability player (OVR 99) — run until we get at least one offer
    const player = makePlayer({ id: 'p-hi', overallRating: 99, isActive: true, potential: 5, age: 17 });
    const clubs = { c1: makeWorldClub('c1', 5) };
    let got = false;
    for (let i = 0; i < 200; i++) {
      const offers = generateNPCBids(1, 1, [player], clubs, new Set());
      if (offers.length > 0) {
        const tv = calculateTransferValue(player);
        expect(offers[0].fee).toBeGreaterThanOrEqual(tv * 0.89); // float tolerance
        expect(offers[0].fee).toBeLessThanOrEqual(tv * 1.31);
        got = true;
        break;
      }
    }
    expect(got).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: FAIL — `generateNPCBids is not a function`

- [ ] **Step 3: Implement `generateNPCBids` in `src/engine/MarketEngine.ts`**

Add after `getFormationTargets`:

```ts
import type { TransferOffer } from '@/types/market';
import type { WorldClub } from '@/types/world';
import { uuidv7 } from '@/utils/uuidv7';

/**
 * Generate NPC club bids on AMP squad players for the current week.
 *
 * @param weekNumber     Current game week
 * @param ampTier        AMP club's 0–3 numeric tier (via TIER_ORDER)
 * @param players        AMP's active squad
 * @param worldClubs     All WorldClub objects from worldStore
 * @param pendingOfferPlayerIds  Player IDs that already have a pending transfer_offer inbox message
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
    if (player.injury) continue;
    if (pendingOfferPlayerIds.has(player.id)) continue;

    // Probability: 5% base + 2% per OVR point above 50, capped at 40%
    const chance = Math.min(0.4, 0.05 + Math.max(0, player.overallRating - 50) * 0.02);
    if (Math.random() > chance) continue;

    const club = eligibleClubs[Math.floor(Math.random() * eligibleClubs.length)];
    const tv   = player.transferValue ?? calculateTransferValue(player);
    const fee  = Math.round(tv * (0.9 + Math.random() * 0.4));

    offers.push({
      id: uuidv7(),
      playerId:        player.id,
      biddingClubId:   club.id,
      biddingClubName: club.name,
      biddingClubTier: club.tier,
      fee,
      weekGenerated: weekNumber,
      expiresWeek:   weekNumber + 4,
    });
  }

  return offers;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/MarketEngine.ts src/__tests__/engine/MarketEngine.test.ts
git commit -m "feat: add generateNPCBids to MarketEngine"
```

---

## Task 6: MarketEngine — processNPCTransfers (TDD)

**Files:**
- Modify: `src/engine/MarketEngine.ts`
- Modify: `src/__tests__/engine/MarketEngine.test.ts`

- [ ] **Step 1: Add failing tests for `processNPCTransfers`**

Append to `src/__tests__/engine/MarketEngine.test.ts`:

```ts
import { processNPCTransfers } from '@/engine/MarketEngine';
import type { WorldPlayer } from '@/types/world';

// Mock worldStore so processNPCTransfers doesn't need AsyncStorage in tests
jest.mock('@/stores/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      mutateClubRoster: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

function makeWorldPlayer(id: string, clubId: string, position: WorldPlayer['position']): WorldPlayer {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    position,
    nationality: 'EN',
    dateOfBirth: '2005-01-01',
    pace: 60, technical: 60, vision: 60, power: 60, stamina: 60, heart: 60,
    personality: {
      determination:10,professionalism:10,ambition:10,loyalty:10,
      adaptability:10,pressure:10,temperament:10,consistency:10,
    },
    npcClubId: clubId,
  };
}

describe('processNPCTransfers', () => {
  it('returns a digest with no transfers when all clubs meet their minimums', async () => {
    // A single club with a full squad at every position — no deficits, no transfers
    const gk  = makeWorldPlayer('gk1',  'c1', 'GK');
    const defenders = Array.from({ length: 8 }, (_, i) =>
      makeWorldPlayer(`d${i}`, 'c1', 'DEF'));
    const mids = Array.from({ length: 8 }, (_, i) =>
      makeWorldPlayer(`m${i}`, 'c1', 'MID'));
    const fwds = Array.from({ length: 4 }, (_, i) =>
      makeWorldPlayer(`f${i}`, 'c1', 'FWD'));

    const clubs: Record<string, import('@/types/world').WorldClub> = {
      c1: { ...makeWorldClub('c1', 5), players: [gk, ...defenders, ...mids, ...fwds] },
    };

    const digest = await processNPCTransfers(1, clubs);
    expect(digest.transfers).toHaveLength(0);
  });

  it('executes a transfer when buyer is below minimum and seller has surplus', async () => {
    // Buyer has 0 FWDs (needs min 4). Seller has 7 FWDs (max 6 = surplus).
    const sellerFwds = Array.from({ length: 7 }, (_, i) =>
      makeWorldPlayer(`sf${i}`, 'seller', 'FWD'));
    const clubs: Record<string, import('@/types/world').WorldClub> = {
      buyer:  { ...makeWorldClub('buyer',  5), players: [] },
      seller: { ...makeWorldClub('seller', 5), players: sellerFwds },
    };

    const digest = await processNPCTransfers(1, clubs);
    expect(digest.transfers.length).toBeGreaterThan(0);
    expect(digest.transfers[0].fromClub).toBe('Club seller');
    expect(digest.transfers[0].toClub).toBe('Club buyer');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: FAIL — `processNPCTransfers is not a function`

- [ ] **Step 3: Implement `processNPCTransfers` in `src/engine/MarketEngine.ts`**

Add at the bottom of the file:

```ts
export interface NpcTransferDigest {
  weekNumber: number;
  transfers: Array<{ playerName: string; fromClub: string; toClub: string; fee: number }>;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function worldPlayerOverall(wp: import('@/types/world').WorldPlayer): number {
  return Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6);
}

/**
 * Simulate one round of NPC-to-NPC transfers.
 * Clubs with roster deficits buy from clubs with surpluses, tier-adjacent.
 * Mutates worldStore club rosters and re-persists to AsyncStorage.
 */
export async function processNPCTransfers(
  weekNumber: number,
  worldClubs: Record<string, import('@/types/world').WorldClub>,
): Promise<NpcTransferDigest> {
  const { useWorldStore } = await import('@/stores/worldStore');
  const digest: NpcTransferDigest = { weekNumber, transfers: [] };

  // Work on a mutable copy so in-loop reads are consistent
  const mutableClubs = Object.fromEntries(
    Object.entries(worldClubs).map(([id, c]) => [id, { ...c, players: [...c.players] }]),
  );

  for (const buyerClub of Object.values(mutableClubs)) {
    const targets   = getFormationTargets(buyerClub.formation ?? '4-4-2');
    const buyerTier = worldTierToAppTier(buyerClub.tier);

    for (const pos of POSITIONS) {
      const buyerCount = buyerClub.players.filter((p) => p.position === pos).length;
      if (buyerCount >= targets[pos].min) continue; // Buyer is not deficient

      // Find tier-adjacent sellers with a surplus at this position
      const potentialSellers = Object.values(mutableClubs).filter((c) => {
        if (c.id === buyerClub.id) return false;
        if (Math.abs(worldTierToAppTier(c.tier) - buyerTier) > 1) return false;
        const sellerTargets = getFormationTargets(c.formation ?? '4-4-2');
        const sellerCount   = c.players.filter((p) => p.position === pos).length;
        return sellerCount > sellerTargets[pos].max;
      });

      if (potentialSellers.length === 0) continue;

      const seller = potentialSellers[Math.floor(Math.random() * potentialSellers.length)];

      // Pick highest-overall surplus player from seller
      const surplusPlayers = seller.players
        .filter((p) => p.position === pos)
        .sort((a, b) => worldPlayerOverall(b) - worldPlayerOverall(a));

      const transferPlayer = surplusPlayers[0];
      if (!transferPlayer) continue;

      const fee = worldPlayerOverall(transferPlayer) * 1000; // pence proxy

      // Update mutable copies
      seller.players    = seller.players.filter((p) => p.id !== transferPlayer.id);
      buyerClub.players = [...buyerClub.players, { ...transferPlayer, npcClubId: buyerClub.id }];

      // Persist both clubs
      await useWorldStore.getState().mutateClubRoster(seller.id, seller.players);
      await useWorldStore.getState().mutateClubRoster(buyerClub.id, buyerClub.players);

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/engine/MarketEngine.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/MarketEngine.ts src/__tests__/engine/MarketEngine.test.ts
git commit -m "feat: add processNPCTransfers to MarketEngine"
```

---

## Task 7: PlayerBrain (TDD)

**Files:**
- Create: `src/engine/PlayerBrain.ts`
- Create: `src/__tests__/engine/PlayerBrain.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/engine/PlayerBrain.test.ts`:

```ts
import { PlayerBrain } from '@/engine/PlayerBrain';
import type { Player } from '@/types/player';

function makePlayer(traits: Partial<Player['personality']> = {}, overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Test', dateOfBirth: '2007-01-01', age: 17,
    position: 'MID', nationality: 'EN', overallRating: 60, potential: 3,
    wage: 10000, transferValue: 60000,
    personality: {
      determination: 10, professionalism: 10, ambition: 10, loyalty: 10,
      adaptability: 10, pressure: 10, temperament: 10, consistency: 10,
      ...traits,
    },
    agentId: null, joinedWeek: 1, isActive: true, morale: 70, relationships: [],
    ...overrides,
  } as Player;
}

describe('PlayerBrain.assessTransferOffer', () => {
  it('a player with high loyalty and same-tier bid prefers to stay', () => {
    const player = makePlayer({ loyalty: 19, ambition: 5 });
    // ampTier=2, biddingTier=2 (same tier), biddingRep=60, ampRep=60
    const result = PlayerBrain.assessTransferOffer(player, 60, 2, 60, 2);
    // Run 10 times — with loyalty=19 and no tier uplift, should almost always be false
    let wantedCount = 0;
    for (let i = 0; i < 10; i++) {
      if (PlayerBrain.assessTransferOffer(player, 60, 2, 60, 2).wantsTransfer) wantedCount++;
    }
    expect(wantedCount).toBeLessThan(5); // majority should prefer staying
  });

  it('a player with high ambition and a higher-tier bid prefers to go', () => {
    const player = makePlayer({ ambition: 19, loyalty: 3 });
    // ampTier=0 (local), biddingTier=3 (elite)
    let wantedCount = 0;
    for (let i = 0; i < 10; i++) {
      if (PlayerBrain.assessTransferOffer(player, 20, 0, 80, 3).wantsTransfer) wantedCount++;
    }
    expect(wantedCount).toBeGreaterThan(5);
  });

  it('returns a non-empty reasoning string', () => {
    const result = PlayerBrain.assessTransferOffer(makePlayer(), 50, 1, 60, 2);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

describe('PlayerBrain.computeRejectionFallout', () => {
  it('returns empty shifts when biddingTier <= ampTier', () => {
    const player = makePlayer({ ambition: 15 });
    const shifts = PlayerBrain.computeRejectionFallout(player, 1, 2); // bidding=1 < amp=2
    expect(Object.keys(shifts)).toHaveLength(0);
  });

  it('returns negative professionalism and temperament shifts when bidding tier > amp tier', () => {
    const player = makePlayer({ ambition: 15, loyalty: 5 });
    const shifts = PlayerBrain.computeRejectionFallout(player, 3, 1); // bidding=3 > amp=1
    expect(shifts.professionalism).toBeLessThan(0);
    expect(shifts.temperament).toBeLessThan(0);
  });

  it('high loyalty reduces the magnitude of the fallout', () => {
    const lowLoyalty  = makePlayer({ ambition: 15, loyalty: 2  });
    const highLoyalty = makePlayer({ ambition: 15, loyalty: 18 });
    const lo = PlayerBrain.computeRejectionFallout(lowLoyalty,  3, 1);
    const hi = PlayerBrain.computeRejectionFallout(highLoyalty, 3, 1);
    expect(Math.abs(hi.professionalism ?? 0)).toBeLessThan(Math.abs(lo.professionalism ?? 0));
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx jest src/__tests__/engine/PlayerBrain.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/engine/PlayerBrain'`

- [ ] **Step 3: Implement `src/engine/PlayerBrain.ts`**

```ts
import type { Player, PersonalityMatrix } from '@/types/player';

export class PlayerBrain {
  /**
   * Assess whether a player wants to accept a transfer offer.
   *
   * @param player            AMP squad player
   * @param ampReputation     AMP club reputation (0–100)
   * @param ampTier           AMP club numeric tier (0–3, via TIER_ORDER)
   * @param biddingReputation Bidding NPC club reputation (0–100)
   * @param biddingTier       Bidding club app tier (0–3, via worldTierToAppTier)
   */
  static assessTransferOffer(
    player: Player,
    ampReputation: number,
    ampTier: number,
    biddingReputation: number,
    biddingTier: number,
  ): { wantsTransfer: boolean; reasoning: string } {
    const { loyalty, ambition, consistency } = player.personality;

    let score = 50;

    // Loyalty pulls toward staying
    score -= (loyalty - 10) * 2.5;

    // Ambition pulls toward a higher-tier move
    if (biddingTier > ampTier) {
      score += (ambition - 10) * 2.5 * (biddingTier - ampTier);
    }

    // Reputation delta — higher-rep club is attractive
    const repDelta = biddingReputation - ampReputation;
    score += repDelta * 0.3;

    // Randomness driven by inconsistency
    const noise = (20 - consistency) * 1.5;
    score += Math.random() * noise - noise / 2;

    const wantsTransfer = score >= 50;

    let reasoning: string;
    if (wantsTransfer) {
      if (biddingTier > ampTier) {
        reasoning = 'This is a step up in class. My ambition demands I pursue it.';
      } else if (repDelta > 15) {
        reasoning = 'The bidding club has a stronger reputation — a promising move.';
      } else {
        reasoning = 'I feel ready to explore a new challenge.';
      }
    } else {
      if (loyalty > 14) {
        reasoning = 'I feel a strong loyalty to this club and the staff who developed me.';
      } else {
        reasoning = 'I am not convinced this move is right for my development.';
      }
    }

    return { wantsTransfer, reasoning };
  }

  /**
   * Compute personality trait shifts when the AMP rejects an offer from a higher-tier club.
   * Only call this when biddingTier > ampTier.
   *
   * @param player        The affected AMP player
   * @param biddingTier   Bidding club app tier (0–3)
   * @param ampTier       AMP club app tier (0–3)
   */
  static computeRejectionFallout(
    player: Player,
    biddingTier: number,
    ampTier: number,
  ): Partial<PersonalityMatrix> {
    if (biddingTier <= ampTier) return {};

    const { ambition, loyalty } = player.personality;
    const tierGap = biddingTier - ampTier; // 1, 2, or 3

    // Base negative impact scaled by ambition and tier gap
    const baseMagnitude = (ambition / 20) * tierGap * 2;

    // Loyalty reduces the damage
    const loyaltyMitigation = loyalty / 20; // 0.05 → 1.0
    const finalMagnitude = Math.max(0.5, baseMagnitude * (1 - loyaltyMitigation * 0.6));

    return {
      professionalism: -Math.round(finalMagnitude),
      temperament:     -Math.round(finalMagnitude * 0.75),
    };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/engine/PlayerBrain.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/PlayerBrain.ts src/__tests__/engine/PlayerBrain.test.ts
git commit -m "feat: add PlayerBrain with assessTransferOffer and computeRejectionFallout"
```

---

## Task 8: ManagerBrain Extension (TDD)

**Files:**
- Modify: `src/engine/ManagerBrain.ts`
- Create: `src/__tests__/engine/ManagerBrain.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/engine/ManagerBrain.test.ts`:

```ts
import { ManagerBrain } from '@/engine/ManagerBrain';
import type { Coach } from '@/types/coach';
import type { Player } from '@/types/player';
import type { MarketPlayer } from '@/types/market';
import type { TransferOffer } from '@/types/market';

function makeManager(traits: Partial<Coach['personality']> = {}): Coach {
  return {
    id: 'm1', name: 'Test Manager', role: 'manager',
    salary: 100000, influence: 15, nationality: 'EN',
    joinedWeek: 1, morale: 70, relationships: [],
    personality: {
      determination:10, professionalism:10, ambition:10, loyalty:10,
      adaptability:10, pressure:10, temperament:10, consistency:10,
      ...traits,
    },
  } as Coach;
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Test Player', dateOfBirth: '2007-01-01', age: 17,
    position: 'MID', nationality: 'EN', overallRating: 60, potential: 3,
    wage: 10000, transferValue: 60000,
    personality: {
      determination:10,professionalism:10,ambition:10,loyalty:10,
      adaptability:10,pressure:10,temperament:10,consistency:10,
    },
    agentId: null, joinedWeek: 1, isActive: true, morale: 70, relationships: [],
    ...overrides,
  } as Player;
}

function makeOffer(fee: number, biddingClubTier: number): TransferOffer {
  return {
    id: 'o1', playerId: 'p1', biddingClubId: 'c1',
    biddingClubName: 'FC Test', biddingClubTier,
    fee, weekGenerated: 1, expiresWeek: 5,
  };
}

describe('ManagerBrain.assessTransferOffer', () => {
  it('recommends SELL when fee is well above transferValue', () => {
    const manager = makeManager({ professionalism: 15 });
    const player  = makePlayer({ transferValue: 50000 });
    const offer   = makeOffer(150000, 2); // 3× transfer value — great deal
    const squad   = [player, makePlayer({ id: 'p2', position: 'MID' }), makePlayer({ id: 'p3', position: 'MID' })];
    const result  = ManagerBrain.assessTransferOffer(manager, player, offer, 50, squad);
    expect(result.recommendation).toBe('sell');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('recommends KEEP when squad is thin at the player position', () => {
    const manager = makeManager();
    const player  = makePlayer({ position: 'GK', transferValue: 60000 });
    const offer   = makeOffer(72000, 2); // modest premium
    const squad   = [player]; // only one GK — very thin
    const result  = ManagerBrain.assessTransferOffer(manager, player, offer, 50, squad);
    expect(result.recommendation).toBe('keep');
  });

  it('returns a non-empty reasoning string', () => {
    const result = ManagerBrain.assessTransferOffer(
      makeManager(), makePlayer(), makeOffer(60000, 2), 50, [makePlayer()],
    );
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

describe('ManagerBrain.assessScoutedPlayer', () => {
  it('recommends SIGN when squad is thin at the player position', () => {
    const manager: MarketPlayer = {
      id: 'mp1', firstName: 'Scout', lastName: 'Gem',
      dateOfBirth: '2007-01-01', nationality: 'EN',
      position: 'GK', potential: 4, currentAbility: 70,
      personality: null, agent: null,
    };
    const squad = [] as Player[]; // no GKs
    const result = ManagerBrain.assessScoutedPlayer(makeManager(), manager, squad, 60, 50000);
    expect(result.recommendation).toBe('sign');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('recommends PASS when wage cost is too high relative to balance', () => {
    const marketPlayer: MarketPlayer = {
      id: 'mp1', firstName: 'Expensive', lastName: 'Guy',
      dateOfBirth: '2005-01-01', nationality: 'EN',
      position: 'MID', potential: 5, currentAbility: 90,
      personality: null, agent: null,
      currentOffer: 500000, // £5,000/wk — very expensive
    };
    const squad = Array.from({ length: 8 }, (_, i) =>
      makePlayer({ id: `mid${i}`, position: 'MID' }),
    );
    // Balance of £10k — can't afford £5k/wk wage
    const result = ManagerBrain.assessScoutedPlayer(makeManager(), marketPlayer, squad, 10000, 10000);
    expect(result.recommendation).toBe('pass');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx jest src/__tests__/engine/ManagerBrain.test.ts --no-coverage
```

Expected: FAIL — `assessTransferOffer is not a function` / `assessScoutedPlayer is not a function`

- [ ] **Step 3: Add the two new static methods to `src/engine/ManagerBrain.ts`**

At the end of the `ManagerBrain` class body, before the closing `}`, add:

```ts
/**
 * Assess whether the manager recommends accepting or rejecting a transfer offer.
 *
 * @param manager     The coach entity with role 'manager'
 * @param player      The AMP player being bid on
 * @param offer       The incoming TransferOffer
 * @param clubBalance AMP club balance in whole pounds (not pence)
 * @param squad       Full AMP squad (used to assess positional depth)
 */
static assessTransferOffer(
  manager: Coach,
  player: Player,
  offer: import('@/types/market').TransferOffer,
  clubBalance: number,
  squad: Player[],
): { recommendation: 'sell' | 'keep'; reasoning: string } {
  const { professionalism, ambition, consistency } = manager.personality;

  let score = 50;

  // Fee vs. transfer value
  const tv    = player.transferValue ?? player.overallRating * 1000;
  const ratio = tv > 0 ? offer.fee / tv : 1;
  if (ratio >= 1.2) score += (ratio - 1.2) * 40; // above 1.2× = significant push to sell
  if (ratio < 0.9)  score -= 20;                  // below fair value = push to keep

  // Squad depth at this position
  const posDepth = squad.filter((p) => p.position === player.position && p.isActive).length;
  if (posDepth <= 1) score -= 30; // only player at this position
  if (posDepth >= 4) score += 10; // well covered

  // Financial pressure
  const lowBalanceThreshold = 20000; // £20k
  if (clubBalance < lowBalanceThreshold) score += 20;

  // Manager personality
  score += (ambition - 10) * 1.5;     // ambitious managers more willing to sell big
  score -= (professionalism - 10) * 1; // professional managers more cautious

  const noise = (20 - consistency) * 2;
  score += Math.random() * noise - noise / 2;

  const recommendation: 'sell' | 'keep' = score >= 50 ? 'sell' : 'keep';

  let reasoning: string;
  if (recommendation === 'sell') {
    if (ratio >= 1.5) {
      reasoning = `The offer is ${Math.round(ratio * 100)}% of transfer value — an excellent return. I'd take it.`;
    } else if (clubBalance < lowBalanceThreshold) {
      reasoning = 'We are tight on funds. Selling could give us room to strengthen elsewhere.';
    } else {
      reasoning = 'We have good cover at this position and the fee is reasonable.';
    }
  } else {
    if (posDepth <= 1) {
      reasoning = `${player.name} is our only player in this position. Losing them now would hurt us badly.`;
    } else if (ratio < 1.0) {
      reasoning = 'The offer is below fair value. We should hold out for a better deal.';
    } else {
      reasoning = 'I think we need to keep the squad intact right now.';
    }
  }

  return { recommendation, reasoning };
}

/**
 * Assess whether the manager recommends signing a newly scouted player.
 *
 * @param manager        The coach entity with role 'manager'
 * @param marketPlayer   The revealed MarketPlayer
 * @param squad          Full AMP squad (for positional depth check)
 * @param clubBalance    AMP club balance in whole pounds
 * @param weeklyWage     Asking weekly wage in pence (marketPlayer.currentOffer ?? marketPlayer.marketValue)
 */
static assessScoutedPlayer(
  manager: Coach,
  marketPlayer: import('@/types/market').MarketPlayer,
  squad: Player[],
  clubBalance: number,
  weeklyWage: number,
): { recommendation: 'sign' | 'pass'; reasoning: string } {
  const { professionalism, consistency } = manager.personality;

  let score = 50;

  // Positional depth
  const posDepth = squad.filter((p) => p.position === marketPlayer.position && p.isActive).length;
  if (posDepth <= 1) score += 25; // desperately need this position
  if (posDepth >= 5) score -= 15; // overstocked

  // Wage affordability — compare to 10 weeks' wage vs. balance
  const tenWeekCost = (weeklyWage / 100) * 10; // whole pounds
  if (tenWeekCost > clubBalance * 0.5) score -= 20; // wage is expensive relative to balance
  if (tenWeekCost < clubBalance * 0.1) score += 10; // affordable

  // Quality signal
  if (marketPlayer.currentAbility >= 75) score += 10;
  if (marketPlayer.potential >= 4)       score += 5;

  score -= (professionalism - 10) * 1; // cautious managers need more convincing

  const noise = (20 - consistency) * 2;
  score += Math.random() * noise - noise / 2;

  const recommendation: 'sign' | 'pass' = score >= 50 ? 'sign' : 'pass';

  let reasoning: string;
  if (recommendation === 'sign') {
    if (posDepth <= 1) {
      reasoning = `We really need cover in this position. I'd sign them quickly.`;
    } else if (marketPlayer.currentAbility >= 75) {
      reasoning = 'The ability level is impressive. Good value for the squad.';
    } else {
      reasoning = 'Looks like a solid option — worth bringing in.';
    }
  } else {
    if (tenWeekCost > clubBalance * 0.5) {
      reasoning = 'The wage demand is too high for our current financial situation.';
    } else if (posDepth >= 5) {
      reasoning = "We're well covered in that position. I'd pass for now.";
    } else {
      reasoning = "Decent player, but not what we need most right now.";
    }
  }

  return { recommendation, reasoning };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/engine/ManagerBrain.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ManagerBrain.ts src/__tests__/engine/ManagerBrain.test.ts
git commit -m "feat: add assessTransferOffer and assessScoutedPlayer to ManagerBrain"
```

---

## Task 9: GameLoop Integration

**Files:**
- Modify: `src/engine/GameLoop.ts`

- [ ] **Step 1: Import MarketEngine and add transferValue recalculation**

At the top of `GameLoop.ts`, add the import:
```ts
import { calculateTransferValue, generateNPCBids } from './MarketEngine';
```

Inside `processWeeklyTick`, find the section where player data is processed (around where `traitShifts` are computed). After the existing player loop, add a transferValue recalculation pass. Place this block before the agent-offer section was (now deleted):

```ts
// ── Update transfer values for all active players ─────────────────────────────
for (const player of players.filter((p) => p.isActive)) {
  const tv = calculateTransferValue(player);
  if (tv !== player.transferValue) {
    useSquadStore.getState().updatePlayer(player.id, { transferValue: tv });
  }
}
```

- [ ] **Step 2: Add NPC bid generation and inbox message creation**

Directly after the transferValue block, add:

```ts
// ── NPC club bids on AMP players ──────────────────────────────────────────────
{
  const { messages } = useInboxStore.getState();
  const pendingOfferPlayerIds = new Set(
    messages
      .filter((m) => m.type === 'transfer_offer' && !m.response)
      .map((m) => m.entityId)
      .filter((id): id is string => !!id),
  );

  const { clubs } = useWorldStore.getState();
  const ampTierNumeric = TIER_ORDER[club.tier as import('@/types/club').ClubTier] ?? 0;

  const npcBids = generateNPCBids(
    weekNumber,
    ampTierNumeric,
    players,
    clubs,
    pendingOfferPlayerIds,
  );

  for (const bid of npcBids) {
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
        fee:              bid.fee,
        biddingClubId:    bid.biddingClubId,
        biddingClubName:  bid.biddingClubName,
        biddingClubTier:  bid.biddingClubTier,
        expiresWeek:      bid.expiresWeek,
      },
    });
  }
}
```

You will need to import `TIER_ORDER` from `@/types/club` and `useWorldStore` from `@/stores/worldStore` at the top if not already imported.

- [ ] **Step 3: Expire stale transfer_offer messages**

In the same section (replacing the deleted `expireOldOffers` call), add:

```ts
// ── Expire stale transfer offers ──────────────────────────────────────────────
{
  const { messages, respond } = useInboxStore.getState();
  messages
    .filter((m) => m.type === 'transfer_offer' && !m.response)
    .filter((m) => (m.metadata?.expiresWeek as number ?? 0) <= weekNumber)
    .forEach((m) => {
      respond(m.id, 'rejected'); // auto-reject expired offers
    });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GameLoop.ts
git commit -m "feat: add transferValue recalc and NPC bid generation to GameLoop"
```

---

## Task 10: doAdvanceWeek Bi-Weekly NPC Transfer Processing

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Import MarketEngine and worldStore**

At the top of `_layout.tsx`, add:
```ts
import { processNPCTransfers } from '@/engine/MarketEngine';
import { useWorldStore } from '@/stores/worldStore';
```

- [ ] **Step 2: Add bi-weekly NPC processing inside `doAdvanceWeek`**

Inside `doAdvanceWeek`, after `void simulationService.runBatchSimulation();` and before the `finally` block, add:

```ts
// ── Bi-weekly NPC transfer simulation ─────────────────────────────────────────
// Runs every 2 game weeks. Advance button stays locked (inside startTick/endTick).
if (result.week % 2 === 0) {
  const { clubs } = useWorldStore.getState();
  try {
    const digest = await processNPCTransfers(result.week, clubs);
    if (digest.transfers.length > 0) {
      const lines = digest.transfers
        .map((t) => `• ${t.playerName}: ${t.fromClub} → ${t.toClub}`)
        .join('\n');
      useInboxStore.getState().addMessage({
        id:      uuidv7(),
        type:    'system',
        week:    result.week,
        subject: `Transfer Window — Week ${result.week}`,
        body:    `${digest.transfers.length} transfer(s) completed this fortnight:\n\n${lines}`,
        isRead:  false,
      });
    }
  } catch (err) {
    console.warn('[doAdvanceWeek] NPC transfer processing failed:', err);
  }
}
```

You will need `uuidv7` imported — add `import { uuidv7 } from '@/utils/uuidv7';` if not already present.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: run bi-weekly NPC transfer simulation inside doAdvanceWeek"
```

---

## Task 11: ScoutingService — Transfer Fee Flag on Reveal

**Files:**
- Modify: `src/engine/ScoutingService.ts`

- [ ] **Step 1: Find the player-reveal logic**

In `ScoutingService.ts`, find the code path that sets `scoutingStatus: 'revealed'` on a `MarketPlayer` (this happens when a scout's assigned player finishes progressing). It calls `updateMarketPlayer`.

- [ ] **Step 2: Add the transfer fee flag at the moment of reveal**

Wherever `updateMarketPlayer(playerId, { scoutingStatus: 'revealed', ... })` is called, extend the update to include:

```ts
// Check worldStore for npcClubId
const { clubs } = useWorldStore.getState();
let requiresTransferFee = false;
let transferFee: number | undefined;

for (const club of Object.values(clubs)) {
  const wp = club.players.find((p) => p.id === playerId);
  if (wp && wp.npcClubId) {
    requiresTransferFee = true;
    // transferFee = rough market value from attributes
    transferFee = Math.round(
      ((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6) * 1000,
    );
    break;
  }
}

updateMarketPlayer(playerId, {
  scoutingStatus: 'revealed',
  // ...existing fields...
  ...(requiresTransferFee ? { requiresTransferFee: true, transferFee } : {}),
});
```

You will need `import { useWorldStore } from '@/stores/worldStore';` at the top if not already there.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/engine/ScoutingService.ts
git commit -m "feat: flag requiresTransferFee on scout reveal for NPC-club players"
```

---

## Task 12: UI — TransferOfferCard in inbox.tsx

**Files:**
- Modify: `app/(tabs)/inbox.tsx`

- [ ] **Step 1: Add imports**

At the top of `inbox.tsx`, add:
```ts
import { PlayerBrain } from '@/engine/PlayerBrain';
import { ManagerBrain } from '@/engine/ManagerBrain';
import { worldTierToAppTier } from '@/engine/MarketEngine';
import { TIER_ORDER } from '@/types/club';
import { formatCurrencyWhole } from '@/utils/currency';
```

- [ ] **Step 2: Add `TransferOfferCard` component**

After the existing `GemPlayerCard` component, add:

```tsx
// ─── Transfer offer card ────────────────────────────────────────────────────────

function TransferOfferCard({ message, onDone }: { message: InboxMessage; onDone: () => void }) {
  const player  = useSquadStore((s) => s.players.find((p) => p.id === message.entityId));
  const squad   = useSquadStore((s) => s.players);
  const club    = useClubStore((s) => s.club);
  const manager = useCoachStore((s) => s.coaches.find((c) => c.role === 'manager'));
  const { respond } = useInboxStore.getState();
  const { removePlayer } = useSquadStore.getState();
  const { addBalance }   = useClubStore.getState();
  const { purgeForPlayer } = useInboxStore.getState();

  const [done, setDone] = useState(false);

  if (!player || done || message.response) {
    return (
      <View style={{
        backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
        padding: 16, alignItems: 'center', gap: 6, ...pixelShadow,
      }}>
        <PixelText size={8} dim>{message.response ? 'OFFER RESOLVED' : 'PLAYER NOT FOUND'}</PixelText>
      </View>
    );
  }

  const meta             = message.metadata ?? {};
  const fee              = (meta.fee as number) ?? 0;
  const biddingClubName  = (meta.biddingClubName as string) ?? 'Unknown Club';
  const biddingClubTier  = (meta.biddingClubTier as number) ?? 7;
  const ampTierNumeric   = TIER_ORDER[club.tier as import('@/types/club').ClubTier] ?? 0;
  const biddingAppTier   = worldTierToAppTier(biddingClubTier);

  const managerOpinion = manager
    ? ManagerBrain.assessTransferOffer(manager, player, {
        id: message.id, playerId: player.id, biddingClubId: (meta.biddingClubId as string) ?? '',
        biddingClubName, biddingClubTier, fee,
        weekGenerated: message.week, expiresWeek: (meta.expiresWeek as number) ?? message.week + 4,
      }, club.balance ?? 0, squad)
    : null;

  const playerOpinion = PlayerBrain.assessTransferOffer(
    player, club.reputation ?? 0, ampTierNumeric,
    club.reputation ?? 0, biddingAppTier,
  );

  function handleAccept() {
    addBalance(fee);
    useClubStore.getState().addEarnings(fee);
    removePlayer(player!.id);
    respond(message.id, 'accepted');
    purgeForPlayer(player!.id);
    setDone(true);
    onDone();
  }

  function handleReject() {
    respond(message.id, 'rejected');
    // Rejection fallout — only when bidding club is higher tier
    if (biddingAppTier > ampTierNumeric) {
      const shifts = PlayerBrain.computeRejectionFallout(player!, biddingAppTier, ampTierNumeric);
      if (Object.keys(shifts).length > 0) {
        useSquadStore.getState().applyTraitShifts({ [player!.id]: shifts });
      }
    }
    setDone(true);
    onDone();
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 14, gap: 12 }}>
        {/* Club + fee header */}
        <View style={{
          backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow,
          padding: 14, ...pixelShadow,
        }}>
          <PixelText size={14} variant="vt323" color={WK.yellow} style={{ marginBottom: 6 }}>
            TRANSFER BID
          </PixelText>
          <PixelText size={10} upper numberOfLines={2}>{biddingClubName}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Badge label={`TIER ${biddingClubTier}`} color="dim" />
            <PixelText size={16} variant="vt323" color={WK.green}>
              {formatCurrencyWhole(fee)}
            </PixelText>
          </View>
          <PixelText size={13} variant="vt323" dim style={{ marginTop: 4 }}>
            For: {player.name}
          </PixelText>
        </View>

        {/* Manager's Opinion */}
        {managerOpinion && (
          <View style={{
            backgroundColor: WK.tealCard, borderWidth: 3,
            borderColor: managerOpinion.recommendation === 'sell' ? WK.red : WK.green,
            padding: 12, ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 6 }}>
              Manager's Opinion
            </PixelText>
            <PixelText size={14} variant="vt323"
              color={managerOpinion.recommendation === 'sell' ? WK.red : WK.green}>
              {managerOpinion.recommendation === 'sell' ? '↑ SELL' : '↓ KEEP'}
            </PixelText>
            <PixelText size={13} variant="vt323" dim style={{ marginTop: 4 }}>
              {managerOpinion.reasoning}
            </PixelText>
          </View>
        )}

        {/* Player's Opinion */}
        <View style={{
          backgroundColor: WK.tealCard, borderWidth: 3,
          borderColor: playerOpinion.wantsTransfer ? WK.orange : WK.tealLight,
          padding: 12, ...pixelShadow,
        }}>
          <PixelText size={8} upper style={{ marginBottom: 6 }}>
            {player.name}'s Opinion
          </PixelText>
          <PixelText size={14} variant="vt323"
            color={playerOpinion.wantsTransfer ? WK.orange : WK.tealLight}>
            {playerOpinion.wantsTransfer ? '→ WANTS TO LEAVE' : '✓ HAPPY TO STAY'}
          </PixelText>
          <PixelText size={13} variant="vt323" dim style={{ marginTop: 4 }}>
            {playerOpinion.reasoning}
          </PixelText>
        </View>

        {/* Actions */}
        <Button label="ACCEPT OFFER" variant="yellow" fullWidth onPress={handleAccept} />
        <Button label="REJECT OFFER" variant="red" fullWidth onPress={handleReject} style={{ marginTop: 4 }} />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Wire `TransferOfferCard` into the inbox message detail renderer**

In `InboxMessageDetail` (the component that renders an expanded inbox message), find where individual message types are rendered. Add a branch for `transfer_offer`:

```tsx
// Inside InboxMessageDetail, before the default body rendering:
if (message.type === 'transfer_offer') {
  return <TransferOfferCard message={message} onDone={onBack} />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/inbox.tsx
git commit -m "feat: add TransferOfferCard to inbox with Manager and Player opinion cards"
```

---

## Task 13: UI — GemPlayerCard Manager Opinion + Morale

**Files:**
- Modify: `app/(tabs)/inbox.tsx`

- [ ] **Step 1: Update `GemPlayerCard` to show Manager Opinion and handle morale**

Replace the `GemPlayerCard` component's interior with the following (keep the outer structure — the recruited/unavailable states stay the same):

Find the `function handleRecruit()` block in `GemPlayerCard` and replace it with:

```tsx
const manager = useCoachStore((s) => s.coaches.find((c) => c.role === 'manager'));
const squad   = useSquadStore((s) => s.players);
const { club } = useClubStore();

const managerOpinion = manager && player
  ? ManagerBrain.assessScoutedPlayer(
      manager,
      player,
      squad,
      club.balance ?? 0,
      player.currentOffer ?? player.marketValue ?? 0,
    )
  : null;

function handleRecruit() {
  // Manager morale: sign when manager said sign → +5
  if (manager && managerOpinion) {
    const delta = managerOpinion.recommendation === 'sign' ? 5 : -5;
    useCoachStore.getState().updateMorale(manager.id, delta);
  }

  // If requires transfer fee, deduct from balance
  if (player?.requiresTransferFee && player?.transferFee) {
    useClubStore.getState().addBalance(-player.transferFee);
    useFinanceStore.getState().addTransaction({
      amount:      -Math.round(player.transferFee / 100),
      category:    'transfer_fee',
      description: `Transfer fee: ${player.firstName} ${player.lastName}`,
      weekNumber:  club.weekNumber ?? 1,
    });
  }

  signPlayer(playerId);
  respond(messageId, 'accepted');
  setRecruited(true);
}

function handlePass() {
  // Manager morale: pass when manager said sign → -5; pass when said pass → no change
  if (manager && managerOpinion?.recommendation === 'sign') {
    useCoachStore.getState().updateMorale(manager.id, -5);
  }
  respond(messageId, 'rejected');
  setRecruited(true); // hide card
}
```

- [ ] **Step 2: Add Manager Opinion card and Transfer Fee indicator to `GemPlayerCard` render**

Inside the return block of `GemPlayerCard`, after the existing stats and before the SIGN button, add:

```tsx
{/* Transfer fee badge if player is from an NPC club */}
{player.requiresTransferFee && player.transferFee && (
  <View style={{
    borderWidth: 2, borderColor: WK.orange, padding: 6, marginBottom: 8,
  }}>
    <PixelText size={13} variant="vt323" color={WK.orange}>
      TRANSFER FEE: {formatCurrencyWhole(player.transferFee)}
    </PixelText>
  </View>
)}

{/* Manager's Opinion */}
{managerOpinion && (
  <View style={{
    backgroundColor: WK.greenDark, borderWidth: 2,
    borderColor: managerOpinion.recommendation === 'sign' ? WK.green : WK.dim,
    padding: 10, marginBottom: 8,
  }}>
    <PixelText size={7} upper style={{ marginBottom: 4 }}>Manager's Opinion</PixelText>
    <PixelText size={13} variant="vt323"
      color={managerOpinion.recommendation === 'sign' ? WK.green : WK.dim}>
      {managerOpinion.recommendation === 'sign' ? '✓ SIGN HIM' : '✗ PASS'}
    </PixelText>
    <PixelText size={12} variant="vt323" dim style={{ marginTop: 3 }}>
      {managerOpinion.reasoning}
    </PixelText>
  </View>
)}
```

Replace the single `SIGN` button with:

```tsx
<Button label="SIGN PLAYER" variant="yellow" fullWidth onPress={handleRecruit} />
<Button label="PASS" variant="teal" fullWidth onPress={handlePass} style={{ marginTop: 6 }} />
```

You will need to import `useCoachStore` and `useFinanceStore` at the top of `inbox.tsx` if not already imported.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/inbox.tsx
git commit -m "feat: add Manager Opinion card to GemPlayerCard with morale consequences"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `AgentOffer`, `agentOffers`, `addAgentOffer`, `expireOldOffers` do not appear anywhere in the codebase (`npx grep -r "agentOffer" src/ app/`)
- [ ] `transfer_offer` inbox messages expire after 4 weeks via the auto-reject loop in GameLoop
- [ ] NPC bids are not generated for injured or inactive players
- [ ] `processNPCTransfers` only runs on even `weekNumber` values
- [ ] `computeRejectionFallout` is only called when `biddingAppTier > ampTierNumeric`
- [ ] Manager morale is updated on the manager `Coach` entity via `coachStore.updateMorale()`, not on a squad player
- [ ] `requiresTransferFee` deduction goes through `financeStore.addTransaction()` for the ledger
- [ ] All new engine files have corresponding tests that pass
