# Season Transition Service — Design Spec

**Date:** 2026-05-01
**Status:** Approved

## Overview

Extract the end-of-season processing logic out of `SeasonEndOverlay.tsx` into a dedicated engine service (`SeasonTransitionService.ts`). Break the process into individually exported, testable functions composed by a single orchestrator. Add a `HISTORY` tab to the Competition hub that displays past season records.

---

## Motivation

`SeasonEndOverlay.tsx` currently conflates UI concerns (rendering the standings table, managing loading state) with game-engine concerns (building pyramid payloads, calling the API, updating stores, distributing finances). This makes individual steps hard to test and extend. Moving the logic to a service gives each step a clear name, clear inputs/outputs, and independent testability.

---

## 1. New File

**`src/engine/SeasonTransitionService.ts`**

Plain TypeScript module. No React imports. All store access via `.getState()`. Follows the existing engine service pattern (see `SimulationService.ts`, `MarketEngine.ts`).

---

## 2. Backend Response Contract

The conclude-season API returns:

```json
{
  "seasonRecordId": "<uuid>",
  "newLeague": null,
  "leagues": [ ... ]
}
```

### Mapping rules — non-negotiable

The service MUST apply these rules exactly. No exceptions, no fallbacks, no interpretation:

1. **Club-to-league assignment is authoritative from the backend.** Each club in `league.clubs` belongs to that league. The service writes exactly those clubs to that league in `worldStore` and `leagueStore`.

2. **`promoted` and `relegated` are status flags only.** They describe what happened to a club (e.g. for display or inbox messaging). They have zero effect on which league a club is assigned to. A club with `relegated: true` in League 8 still belongs to League 8 — there is no lower league.

3. **`isAmp: true` is the authoritative signal for finding the AMP's league.** The service finds the AMP's league by scanning `leagues[].clubs` for the entry where `isAmp === true`. `newLeague` at the response root is informational only and not used for store updates.

4. **No deduplication.** Each club appears in exactly one league in the response. The service does not need to deduplicate or cross-reference leagues.

5. **AMP club is excluded from NPC club lists.** `worldStore` and `leagueStore`'s NPC club arrays filter out the entry where `isAmp === true`.

---

## 4. Types

### `SeasonTransitionSnapshot`

Plain object built by `SeasonEndOverlay` from its captured standings before any store mutations occur. Passed as the single argument to `performSeasonTransition`.

```ts
export interface SeasonTransitionSnapshot {
  currentLeague:  LeagueSnapshot;
  currentSeason:  number;
  finalPosition:  number;
  promoted:       boolean;
  relegated:      boolean;
  weekNumber:     number;
  // AMP's season stats — passed directly to the conclude-season API payload
  gamesPlayed:    number;
  wins:           number;
  draws:          number;
  losses:         number;
  goalsFor:       number;
  goalsAgainst:   number;
  points:         number;
}
```

---

## 5. Exported Functions

### Read-only helpers

These functions only read from stores (via `.getState()`) and do not mutate any state.

#### `buildLeagueStandings`
```ts
buildLeagueStandings(
  leagueId: string,
  clubIds: string[],          // all clubs in the league including AMP if present
  promotionSpots: number | null,
  season: number,
): PyramidStanding[]
```
Reads fixture results from `fixtureStore.getState()`. Computes pts/gd/gf per club, sorts, assigns `promoted` and `relegated` flags. Single function for both the AMP league and all NPC leagues — there is no special AMP path.

#### `buildPyramidPayload`
```ts
buildPyramidPayload(
  currentLeagueId: string,
  worldLeagues: WorldLeague[],
  season: number,
): PyramidLeague[]
```
Iterates all world leagues. For each, calls `buildLeagueStandings` to produce standings. For the AMP's league, the AMP club ID is included in `clubIds` (sourced from `clubStore`). Returns the full `PyramidLeague[]` array for the conclude-season API payload.

#### `buildLeagueSnapshot`
```ts
buildLeagueSnapshot(
  seasonLeague: SeasonUpdateLeague,
  season: number,
): LeagueSnapshot
```
Builds a `LeagueSnapshot` for `leagueStore` from a `SeasonUpdateLeague` entry returned by the backend. Filters out the AMP entry (`isAmp: true`). Looks up club metadata from `worldStore.getState().clubs`. Each club appears in exactly one league in the backend response — no deduplication.

### Store-mutating steps

#### `applySeasonResponse`
```ts
applySeasonResponse(
  responseLeagues: SeasonUpdateLeague[],
  currentLeague: LeagueSnapshot,
  nextSeason: number,
): Promise<void>
```
1. Calls `worldStore.getState().applySeasonUpdate(responseLeagues)` — updates all NPC league memberships and club tiers.
2. Finds the AMP's new league from the `isAmp` flag in the response.
3. Calls `leagueStore.getState().setFromSync(buildLeagueSnapshot(ampLeague, nextSeason))`.
4. If the AMP has moved leagues, adds a `system` inbox message (PROMOTED / RELEGATED).
5. Calls `fixtureStore.getState().clearSeason()` then loads server-generated fixtures for all response leagues via `loadFromServerSchedule`.

#### `distributeSeasonFinances`
```ts
distributeSeasonFinances(
  ampSeasonLeague: SeasonUpdateLeague | undefined,
  currentLeague: LeagueSnapshot,
  nextSeason: number,
  finalPosition: number,
  weekNumber: number,
): void
```
Credits `financeStore` for the new season's TV deal, league sponsor pot, flat prize money, and position-based prize. Falls back to `currentLeague` financial fields if `ampSeasonLeague` is undefined. All values in pence, converted via `penceToPounds`.

#### `recordSeasonHistory`
```ts
recordSeasonHistory(
  snapshot: SeasonTransitionSnapshot,
  displayStandings: SeasonStanding[],
  ampClubId: string,
): void
```
Writes the completed season record to `leagueHistoryStore`. Uses `displayStandings` (the captured pre-transition table) to record each club's final position, stats, and promoted/relegated flags.

`SeasonStanding` is a named interface exported from `SeasonTransitionService.ts` (replacing the local `Standing` interface in `SeasonEndOverlay.tsx`). `SeasonEndOverlay` imports it for typing its `displayStandings` state.

### Orchestrator

#### `performSeasonTransition`
```ts
performSeasonTransition(snapshot: SeasonTransitionSnapshot): Promise<void>
```
The only function `SeasonEndOverlay` calls. Sequence:

1. `buildPyramidPayload(...)` — builds full pyramid standings
2. `concludeSeason(API call)` — sends payload, receives `SeasonUpdateLeague[]`
3. `applySeasonResponse(responseLeagues, ...)` — updates worldStore, leagueStore, fixtureStore, inbox
4. `distributeSeasonFinances(...)` — credits financeStore
5. `recordSeasonHistory(...)` — writes leagueHistoryStore

If the API call throws, the error propagates to the caller. There is no offline fallback — conclude-season is a core process requiring a server response.

---

## 6. `SeasonEndOverlay.tsx` — Changes

The component retains only UI concerns:

- React state: `isLoading`, `displayStandings`, `displayPromotionSpots`, `displayLeagueName`
- `standings` useMemo — derives the live standings table from `leagueStore` + `fixtureStore` for display
- Snapshot capture at transition start (reads from the useMemo before stores mutate)
- Single call: `await performSeasonTransition(snapshot)`
- Error catch: clears `isLoading`, surface error state if needed
- All rendering (standings table, AMP summary row, header, footer button)

`buildLeagueSnapshot`, `buildNpcLeagueStandings`, and the `performSeasonTransition` function body are fully removed from this file.

---

## 7. History Tab

### Location
New `HISTORY` pane added to the Competition hub's `PixelTopTabBar` alongside the existing tabs.

### Component
**`src/components/competitions/SeasonHistory.tsx`**

Reads from `useLeagueHistoryStore`. Renders season records in reverse chronological order (most recent first).

**Collapsed row** (always visible):
- Tier badge (T1, T2, etc.)
- League name
- Season number
- Final position with colour coding: promoted = `WK.green`, relegated = `WK.red`, mid-table = `WK.yellow`
- W/D/L and points

**Expanded row** (tap to expand; one open at a time):
- Full final standings table: Pos / Club colour swatch / Club name / PL / GD / PTS
- AMP club row highlighted in `WK.yellow`
- Same column layout as the existing `LeagueTable` component

### Data
`leagueHistoryStore` already captures all required fields (tier, leagueName, season, weekCompleted, per-club position/stats/promoted/relegated). No schema changes required.

---

## 8. Files Affected

| File | Change |
|------|--------|
| `src/engine/SeasonTransitionService.ts` | **New** |
| `src/components/SeasonEndOverlay.tsx` | Slim to UI shell, remove logic |
| `src/components/competitions/SeasonHistory.tsx` | **New** |
| `app/(tabs)/competitions.tsx` | Add HISTORY tab |

---

## 9. Out of Scope

- Changes to `leagueHistoryStore` schema
- Changes to the conclude-season API contract
- UI changes to the existing League Browser or League Table components
