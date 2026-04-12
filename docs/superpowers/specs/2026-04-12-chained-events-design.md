# Chained Events Design

**Date:** 2026-04-12
**Status:** Approved

## Overview

Add a chained event system so that when a game event fires for a pair of players, it can boost the probability of one or more follow-up events firing for that same pair within a configurable time window. Chains can be multi-step (A→B→C). Configuration lives entirely in the backend; the frontend holds active chain state in a dedicated store.

---

## 1. Backend — Data Model

### `GameEventTemplate` entity changes

Add a `chainedEvents` nullable JSON column to `GameEventTemplate`. The column is `null` when no chain is configured.

**Schema per chain link:**

```json
{
  "nextEventSlug": "player-fight",
  "boostMultiplier": 4.0,
  "windowWeeks": 4,
  "note": "Argument escalates to physical altercation"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `nextEventSlug` | string | yes | Slug of the event whose weight is boosted |
| `boostMultiplier` | float | yes | Multiplier applied to `nextEventSlug`'s weight during selection |
| `windowWeeks` | integer | yes | Number of weeks the boost remains active after the source event fires |
| `note` | string | no | Admin-facing description of the chain intent; not sent to the frontend |

**Multi-step chains:** Event B can itself carry a `chainedEvents` entry pointing at C. The same mechanism handles it automatically — no special handling required.

### Entity additions

- `chainedEvents`: `?array` (nullable JSON column, Doctrine ORM)
- Virtual accessors: `getChainedEventsJson(): string` / `setChainedEventsJson(?string): void` — mirrors the existing `impacts` / `firingConditions` pattern

### API serialisation

`/api/events/templates` includes `chainedEvents` in each template's serialised output. The `note` field is **excluded** from the frontend payload — only `nextEventSlug`, `boostMultiplier`, and `windowWeeks` are sent.

---

## 2. Frontend — `eventChainStore`

New Zustand persisted store at `src/stores/eventChainStore.ts`.

### `ActiveChainBoost` type

```ts
interface ActiveChainBoost {
  id: string;           // uuidv7
  pairKey: string;      // canonical: `${minId}:${maxId}` (lower UUID first)
  sourceSlug: string;   // slug of the event that activated this boost
  boostedSlug: string;  // slug whose weight is boosted
  multiplier: number;
  expiresWeek: number;  // currentWeek + windowWeeks at activation time
}
```

`pairKey` is always normalised (lower UUID first) so `(A, B)` and `(B, A)` resolve to the same key.

### Store actions

| Action | Behaviour |
|---|---|
| `activateChain(sourceSlug, playerAId, playerBId, link, currentWeek)` | Upserts an entry for the pair+boostedSlug combination. If an entry already exists, the `expiresWeek` is refreshed (window restarts). |
| `expireChains(currentWeek)` | Removes all entries where `expiresWeek <= currentWeek`. Called at the top of every `processWeeklyTick()`. |
| `getBoostsForPair(playerAId, playerBId)` | Returns all active `ActiveChainBoost` entries for the given pair. |

---

## 3. Engine Integration

### Activation — when an event fires

In `SocialGraphEngine.ts`, after a NPC pair event is confirmed as fired and logged, iterate over the fired template's `chainedEvents` array. For each link, call:

```ts
activateChain(firedSlug, playerAId, playerBId, link, currentWeek)
```

### Boost application — at selection time

Before running weighted random selection for a pair in `SocialGraphEngine.ts`:

1. Call `getBoostsForPair(playerAId, playerBId)`.
2. For each active boost, find the matching template in the candidate pool.
3. Multiply that template's `weight` by the boost `multiplier` to produce an adjusted weight.
4. Run weighted selection using adjusted weights. **Original template weights are never mutated.**

### Expiry

`expireChains(currentWeek)` is called at the top of `processWeeklyTick()` in `GameLoop.ts`, before any event evaluation, keeping the store clean.

---

## 4. Admin — Structured EasyAdmin Forms

Replace all raw JSON textarea fields on `GameEventTemplateCrudController` with structured `CollectionField` forms. All fields still persist as JSON columns in the database — the structured form is purely a UI layer.

### `chainedEvents` form

A `CollectionField` where each entry renders:

| Field | Control | Notes |
|---|---|---|
| `nextEventSlug` | Dropdown | Populated from all existing `GameEventTemplate` slugs |
| `boostMultiplier` | Number input | Float; min 1.0 |
| `windowWeeks` | Integer input | Min 1 |
| `note` | Text input (nullable) | Admin documentation only |

### `firingConditions` form

A single structured sub-form (not a collection — `firingConditions` is one object, not an array):

| Field | Control |
|---|---|
| `minSquadMorale` / `maxSquadMorale` | Number inputs (nullable) |
| `minPairRelationship` / `maxPairRelationship` | Number inputs (nullable) |
| `requiresCoLocation` | Boolean toggle |
| `actorTraitRequirements` | `CollectionField`: trait dropdown (from `TraitName` enum) + min/max number inputs |
| `subjectTraitRequirements` | Same as above |

### `impacts` form

Structured sub-forms per impacts section:

**`selection_logic`** (optional sub-form): `target_type` dropdown (`TargetType` enum), `count` integer, `filter` sub-form (position text, `active_only` boolean, min/max age integers, `max_level` integer).

**`stat_changes`** (`CollectionField`): `target` text, `field` text, `operator` dropdown (`StatOperator` enum: add/subtract/set), `value` number.

**`relationships`** (`CollectionField`): `type` dropdown (`RelationshipType` enum: rivalry/friendship), `player_1_ref` text, `player_2_ref` text, `intensity` number.

**`duration_config`** (optional sub-form): `ticks` integer, `completion_event_slug` dropdown (existing template slugs), `tick_effect` structured as a single `StatChange` sub-form.

**`choices`** (`CollectionField`): `emoji` text, `label` text, `manager_shift` sub-form (temperament/discipline/ambition numbers). `stat_changes` within each choice is rendered as a compact JSON textarea — full nesting via `CollectionField` is deferred as a future enhancement given EasyAdmin's nesting limitations.

---

## 5. Type changes

### `GameEventTemplate` (frontend type, `src/types/narrative.ts`)

```ts
export interface ChainLink {
  nextEventSlug: string;
  boostMultiplier: number;
  windowWeeks: number;
  // note is excluded — not sent to frontend
}

export interface GameEventTemplate {
  // ... existing fields ...
  chainedEvents?: ChainLink[] | null;
}
```

---

## 6. Error handling

- **Unknown slug in chain**: if `nextEventSlug` does not match any loaded template at boost-application time, the entry is silently skipped. No crash; the chain simply has no effect.
- **Missing chainedEvents on template**: treated as empty array — no chain activations triggered.
- **Store persistence**: `eventChainStore` uses the same `zustandStorage` / persist middleware pattern as other stores. On app restart, active boosts survive; expired entries are pruned on the next `processWeeklyTick()`.

---

## 7. Testing

- **Backend**: Unit test `GameEventTemplate` entity — setting/getting `chainedEvents` JSON; migration applies cleanly.
- **Frontend store**: Unit test `activateChain` (upsert behaviour, window refresh), `expireChains` (removes expired, keeps active), `getBoostsForPair` (canonical pair key normalisation).
- **Engine**: Unit test weighted selection in `SocialGraphEngine` — verify boost multiplier is applied to the correct template and original weights are unchanged.
- **Admin forms**: Manual QA — create a chain in the admin, verify the JSON written to DB matches the expected schema.
