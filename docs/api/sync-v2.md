# POST /api/sync — v2 Payload Spec

**Status:** Proposed
**Date:** 2026-05-03
**Audience:** Backend engineering

---

## Overview

The weekly sync call is the primary telemetry channel from the client to the server. The client is authoritative for all game state; the backend records, reconciles, and powers leaderboards and career analytics.

This document specifies additions to both the request body and the accepted response. All existing fields remain unchanged — this is a purely additive change.

---

## Request body additions (`SyncRequest`)

### `form`

```ts
form: ('W' | 'D' | 'L')[]
```

Last ≤5 league results for the AMP club, newest first. Derived client-side from `fixtureStore` — AMP fixtures with results, sorted by round descending. Empty array if no results yet this season.

**Example:** `["W", "W", "D", "L", "W"]`

---

### `leaguePosition`

```ts
leaguePosition: number | null
```

AMP's current position in the league table (1 = top). Computed client-side from the local standings. `null` if the club has no league assignment.

---

### `seasonRecord`

```ts
seasonRecord: {
  wins:         number;
  draws:        number;
  losses:        number;
  goalsFor:     number;
  goalsAgainst: number;
  points:       number;
}
```

Season running totals at the time of sync. Derived from all completed AMP fixtures in `fixtureStore` for the current season.

---

### `matchResults`

```ts
matchResults: Array<{
  fixtureId:        string;
  leagueId:         string;
  season:           number;
  round:            number;
  opponentClubId:   string;
  opponentClubName: string;
  homeGoals:        number;
  awayGoals:        number;
  /** true if the AMP club was the home side */
  isHome:           boolean;
  playedAt:         string;  // ISO 8601
}>
```

Full result detail for every unsynced AMP fixture. The client tracks a `synced: boolean` flag per fixture; this array contains all entries where `synced === false`. Backend confirms receipt via `syncedFixtureIds` in the response (see below), at which point the client marks those fixtures as synced.

This supersedes any implicit fixture sync logic — the fixture ID is the idempotency key.

---

### `playerStats`

```ts
playerStats: Array<{
  playerId:      string;
  appearances:   number;
  goals:         number;
  assists:       number;
  /** Mean of all per-match rating values (1–10) for this season */
  averageRating: number;
}>
```

Season-to-date stats snapshot for every AMP player with at least one appearance this season. Derived from `player.appearances[season][clubId]`. Backend should upsert by `(playerId, season)`.

---

### `signings`

```ts
signings: Array<{
  playerId:      string;
  playerName:    string;
  position:      'GK' | 'DEF' | 'MID' | 'FWD';
  age:           number;
  overallRating: number;
  /** Transfer fee paid in pence. 0 for free agents. */
  fee:           number;
  /** Source NPC club name. null = free agent or generated prospect. */
  fromClub:      string | null;
}>
```

Players signed into the AMP squad this week. Complements the existing `transfers[]` array, which covers only outgoing sales. The combination of `transfers` (outgoing) and `signings` (incoming) gives the backend a complete picture of the transfer window each week.

---

### `squadAvgOvr`

```ts
squadAvgOvr: number
```

Mean `overallRating` of all active (non-injured, non-inactive) players at the time of sync. Integer, rounded. Used for leaderboard tie-breaking and career analytics.

---

## Full `SyncRequest` shape (v2)

```ts
interface SyncRequest {
  weekNumber:          number;
  clientTimestamp:     string;          // ISO 8601

  // ── Financial ────────────────────────────────────────────────────────────
  earningsDelta:       number;          // pence, signed
  balance:             number;          // pence
  totalCareerEarnings: number;          // pence

  // ── Reputation ───────────────────────────────────────────────────────────
  reputationDelta:     number;
  reputation:          number;          // 0–100

  // ── Club snapshot ────────────────────────────────────────────────────────
  hallOfFamePoints:    number;
  squadSize:           number;
  staffCount:          number;
  facilityLevels:      Record<string, number>;
  squadAvgOvr:         number;          // NEW

  // ── Activity ─────────────────────────────────────────────────────────────
  transfers:           SyncTransfer[];
  ledger:              SyncLedgerEntry[];
  signings:            SyncSigning[];   // NEW

  // ── Season performance ───────────────────────────────────────────────────
  form:                ('W' | 'D' | 'L')[];   // NEW
  leaguePosition:      number | null;          // NEW
  seasonRecord:        SyncSeasonRecord;       // NEW
  matchResults:        SyncMatchResult[];      // NEW
  playerStats:         SyncPlayerStat[];       // NEW
}
```

---

## Response body additions (`SyncAcceptedResponse`)

### `syncedFixtureIds`

```ts
syncedFixtureIds?: string[]
```

IDs of every fixture the backend successfully recorded from `matchResults`. Client calls `fixtureStore.markSynced(syncedFixtureIds)` on receipt. If the field is absent the client leaves all fixture sync flags unchanged (backwards compatibility).

---

### `achievements`

```ts
achievements?: Array<{
  /** Machine-readable type for deduplication. e.g. 'unbeaten_run_5' | 'top_scorer_league' | 'hat_trick' */
  type:        string;
  /** Human-readable message, displayed directly in the inbox. */
  description: string;
  weekNumber:  number;
}>
```

Server-detected milestones fired this week. The client surfaces each entry as a system inbox message. Empty array or absent field = no achievements this week. The `type` field is the idempotency key — the client deduplicates by `type + weekNumber`.

**Suggested types the backend should detect:**

| type | Trigger |
|---|---|
| `unbeaten_run_5` | 5 consecutive league games without a loss |
| `winning_streak_3` | 3 consecutive wins |
| `top_scorer_league` | AMP player leads the league in goals |
| `clean_sheet_run_3` | 3 consecutive clean sheets |
| `promotion_clinched` | Mathematical promotion secured before final day |
| `title_clinched` | Mathematical title secured before final day |

---

## Full `SyncAcceptedResponse` shape (v2)

```ts
interface SyncAcceptedResponse {
  accepted:           true;
  weekNumber:         number;
  syncedAt:           string;           // ISO 8601

  gameConfig?:        GameConfig;
  facilityTemplates?: FacilityTemplate[];

  // ── Club aggregates ──────────────────────────────────────────────────────
  club: {
    id:                  string;
    reputation:          number;
    totalCareerEarnings: number;
    hallOfFamePoints:    number;
    balance?:            number;        // pence
  };

  league:              LeagueSnapshot | null;

  // ── New ──────────────────────────────────────────────────────────────────
  syncedFixtureIds?:   string[];
  achievements?:       SyncAchievement[];
}
```

---

## Monetary conventions

- All monetary values (`fee`, `earningsDelta`, `balance`, `totalCareerEarnings`) are in **pence**.
- Divide by 100 for display. Never send fractional pence.

## Idempotency

- `weekNumber` is the primary deduplication key for the sync record.
- `fixtureId` is the deduplication key for match results — re-sending the same fixture is a safe no-op.
- `achievements[].type + achievements[].weekNumber` is the deduplication key for achievement inbox messages on the client.
