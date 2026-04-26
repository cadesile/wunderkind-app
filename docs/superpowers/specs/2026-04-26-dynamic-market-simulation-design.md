# Dynamic Market Simulation — Design Spec

**Date:** 2026-04-26
**Status:** Approved

## Overview

Replace the random agent-offer transfer system with a full Dynamic Market Simulation. NPC clubs (drawn from `worldStore`) form a living hierarchy that builds squads, trades with each other, and makes direct bids on AMP players. The AMP player (human) always makes the final accept/reject call on any offer. `ManagerBrain` and `PlayerBrain` provide advisory opinion cards to inform that decision.

---

## 1. Data Models

### `WorldClub` (src/types/world.ts)
Add:
```ts
formation: string; // e.g. '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1'
```
Assigned randomly from a preset list during `worldStore.setFromWorldPack()`. Stored in AsyncStorage alongside existing club data.

### `WorldPlayer` (src/types/world.ts)
Add:
```ts
npcClubId: string | null;
```
Set during `worldStore.setFromWorldPack()` by scanning each `WorldClub.players[]` roster. Updated by `MarketEngine.processNPCTransfers()` when players move between clubs. WorldStore AsyncStorage re-persisted on every mutation.

### `Player` (src/types/player.ts)
Add:
```ts
transferValue: number; // pence — recalculated each weekly tick
```

### `MarketPlayer` (src/types/market.ts)
Add two optional fields set at scout reveal time:
```ts
requiresTransferFee?: boolean; // true when the player has a non-null npcClubId
transferFee?: number;          // pence — copied from WorldPlayer.transferValue at reveal
```

### Tier Mapping Convention
AMP club tier is stored as `ClubTier` string. `TIER_ORDER` maps it to 0–3 (`local`→0, `elite`→3). `WorldClub.tier` is a numeric league tier (1 = top flight). For ±1 adjacency comparisons, `WorldClub.tier` is bucketed into the same 0–3 scale:
- tier 1–2 → 3 (elite)
- tier 3–4 → 2 (national)
- tier 5–6 → 1 (regional)
- tier 7+  → 0 (local)

`MarketEngine` exports a `worldTierToAppTier(worldTier: number): number` helper (returns 0–3) used wherever AMP tier and WorldClub tier are compared.

### `TransferOffer` (src/types/market.ts)
New type:
```ts
export interface TransferOffer {
  id: string;
  playerId: string;
  biddingClubId: string;
  biddingClubName: string;
  biddingClubTier: number;       // numeric tier from WorldClub
  fee: number;                   // pence
  weekGenerated: number;
  expiresWeek: number;           // weekGenerated + 4
}
```

### `InboxMessageType` (src/stores/inboxStore.ts)
Add `'transfer_offer'` to the union. TransferOffers surface as `InboxMessage` with:
- `type: 'transfer_offer'`
- `requiresResponse: true`
- `entityId`: playerId
- `metadata`: `{ fee, biddingClubId, biddingClubName, biddingClubTier }`

### Agent Offer System — Removed
The following are fully removed:
- `agentOffers: AgentOffer[]` array and all related methods from `inboxStore` (`addAgentOffer`, `acceptAgentOffer`, `rejectAgentOffer`, `expireOldOffers`)
- `AgentOffer` type from `src/types/narrative.ts`
- `src/engine/agentOffers.ts`
- `generateAgentOffer` call from `GameLoop.ts`

---

## 2. Engine Architecture

### `src/engine/MarketEngine.ts` (new)

**`calculateTransferValue(player: Player): number`**
- Formula: `overallRating × ageFactor × potentialMultiplier`
- `ageFactor`: peaks at age 17, decays linearly after 21 (e.g. 1.4 at 17, 1.0 at 21, 0.6 at 25)
- `potentialMultiplier`: maps 1–5 stars to 0.8–1.5
- Returns pence

**`getFormationTargets(formation: string): Record<Position, { min: number; max: number }>`**
- Maps formation string to position squad-size targets (2–3 players per slot):
  - `'4-4-2'` → GK:{1,2}, DEF:{8,12}, MID:{8,12}, FWD:{4,6}
  - `'4-3-3'` → GK:{1,2}, DEF:{8,12}, MID:{6,9}, FWD:{6,9}
  - `'4-2-3-1'` → GK:{1,2}, DEF:{8,12}, MID:{6,10}, FWD:{4,6}
  - `'3-5-2'` → GK:{1,2}, DEF:{6,9}, MID:{10,15}, FWD:{4,6}
  - `'5-3-2'` → GK:{1,2}, DEF:{10,15}, MID:{6,9}, FWD:{4,6}
  - `'4-5-1'` → GK:{1,2}, DEF:{8,12}, MID:{10,15}, FWD:{2,4}

**`generateNPCBids(weekNumber, ampTier, players, worldClubs): TransferOffer[]`**
- For each active AMP player: roll probability scaled by `overallRating` and `potential`
- Bidding club is selected from world clubs within ±1 numeric tier of AMP's tier
- Fee = `transferValue × rand(0.9–1.3)`
- Guard: skip player if they already have a pending `transfer_offer` inbox message
- Returns at most one offer per player per tick

**`processNPCTransfers(weekNumber, worldClubs): NpcTransferDigest`**
- Iterates every WorldClub; computes roster gaps vs. `getFormationTargets(club.formation)` per position
- Clubs with surpluses at a position are sellers; clubs below minimum are buyers
- Buyer picks the highest-`transferValue` surplus player from a tier-adjacent seller
- On each trade: update `WorldPlayer.npcClubId`, mutate both clubs' `players[]` arrays, re-persist to AsyncStorage
- Returns `NpcTransferDigest`: list of `{ playerName, fromClub, toClub, fee }` for inbox digest

---

### `src/engine/PlayerBrain.ts` (new)

**`assessTransferOffer(player, ampClub, biddingClub): { wantsTransfer: boolean; reasoning: string }`**
- Score from 50 baseline
- `loyalty` trait: each point above 10 subtracts from score (pulls toward staying)
- `ambition` trait: each point above 10 adds to score when bidding club tier > AMP tier
- Reputation delta between clubs (positive = bidding club has higher rep): adds to score
- Randomness driven by `(20 - consistency)`
- `wantsTransfer = finalScore >= 50`

**`computeRejectionFallout(player, biddingClubTier, ampTier): Partial<PersonalityMatrix>`**
- Only called when bidding club tier is strictly above AMP tier
- Base negative impact on `professionalism` and `temperament`: scales with `ambition` (trait value)
- Mitigation: `loyalty` trait reduces magnitude
- Returns trait deltas (negative); applied via `squadStore.applyTraitShifts()`

---

### `src/engine/ManagerBrain.ts` (extended)

**`assessTransferOffer(manager, player, offer, ampClub): { recommendation: 'sell' | 'keep'; reasoning: string }`**
- Score from 50 baseline
- Fee vs. `transferValue` ratio: above 1.2× pushes toward sell
- Squad depth at player's position: thin squad pushes toward keep
- Current balance: low balance pushes toward sell
- Manager `professionalism` and `ambition` traits modulate score
- Returns human-readable `reasoning` string for the UI card

**`assessScoutedPlayer(manager, marketPlayer, squad, club): { recommendation: 'sign' | 'pass'; reasoning: string }`**
- Evaluates whether the manager wants to sign a newly scouted player
- Factors: squad depth at player's position, perceived rating vs. wage cost, current balance
- Returns `reasoning` string for display on the scout reveal screen

---

## 3. GameLoop & Weekly Tick Integration

### Every tick (`processWeeklyTick`)
1. Recalculate `transferValue` for all active players → `squadStore.updatePlayer(id, { transferValue })`
2. Call `MarketEngine.generateNPCBids()` → push each resulting `TransferOffer` as an `InboxMessage`
3. Remove the existing `generateAgentOffer` call entirely

### Every 2 ticks (`doAdvanceWeek`, inside `startTick/endTick`)
```ts
if (weekNumber % 2 === 0) {
  const digest = await MarketEngine.processNPCTransfers(weekNumber, worldStore.clubs);
  if (digest.transfers.length > 0) {
    inboxStore.addMessage({ type: 'system', /* digest body */ });
  }
}
```
The Advance button stays locked for the full duration — no new `tickProgressStore` flags required.

### Rejection Fallout
Triggered in `inbox.tsx` when AMP rejects a `transfer_offer`:
- Only fires when `biddingClubTier > ampTier`
- Calls `PlayerBrain.computeRejectionFallout()` → `squadStore.applyTraitShifts()`

---

## 4. Scouting Integration

### `WorldPlayer.npcClubId`
Set at world init. Updated on every NPC-to-NPC transfer. Derivable from `WorldClub.players[]` but stored directly for O(1) lookup.

### Scout Reveal Flow
When a scout fully reveals a `MarketPlayer` whose `npcClubId` is non-null:
- Set `requiresTransferFee: true` and `transferFee: WorldPlayer.transferValue` on the `MarketPlayer` entry
- Hire UI shows "Transfer Required: £X" instead of signing wage only
- On hire: deduct `transferFee` from balance, update selling NPC club's roster in worldStore

### Manager Opinion on Scout Reveals
- Scout reveal screen displays a **Manager's Opinion card** using `ManagerBrain.assessScoutedPlayer()`
- Manager morale consequences (applied to the manager's `morale` field via `coachStore.updateCoach()`):

  | Manager recommendation | AMP decision | Manager morale |
  |---|---|---|
  | Sign | Signs | +5 |
  | Sign | Rejects | -5 |
  | Don't sign | Signs | -5 |
  | Don't sign | Rejects | no change |

---

## 5. UI — inbox.tsx & Scout Reveal

### `TransferOfferCard` component
Rendered for `type: 'transfer_offer'` inbox messages. Displays:
- Bidding club name and tier badge
- Offered fee (formatted as £X)
- **Manager's Opinion card** — `ManagerBrain.assessTransferOffer()` result: `recommendation` label + `reasoning` text
- **Player's Opinion card** — `PlayerBrain.assessTransferOffer()` result: `wantsTransfer` label + `reasoning` text
- **Accept** button: `addBalance(fee)`, `removePlayer(playerId)`, `respond(id, 'accepted')`, `purgeForPlayer(playerId)`
- **Reject** button: `respond(id, 'rejected')` + conditional rejection fallout if bidding tier > AMP tier

### NPC Transfer Digest
Rendered as a standard read-only `type: 'system'` message, delivered every 2 weeks listing all NPC club movements with club names and fees. Non-actionable.

### Scout Reveal Screen
Adds a **Manager's Opinion card** alongside the existing player stat reveal. Manager morale is updated at the point the AMP confirms or dismisses the signing.

---

## 6. Advance Button Locking

NPC transfer processing (`processNPCTransfers`) is awaited inside `doAdvanceWeek` within the existing `startTick / endTick` try/finally block. No new `tickProgressStore` flags are needed. The bi-weekly guard (`weekNumber % 2 === 0`) keeps the overhead minimal on off-weeks.

---

## Out of Scope

- AI-driven ManagerBrain / PlayerBrain (infrastructure laid, implementation deferred)
- NPC club financial modelling (fees are consumed narratively; clubs don't have persistent budgets)
- Player agents for NPC players (NPC transfers are direct club-to-club)
