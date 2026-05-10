# SQLite Historical Storage Migration — Design Spec

**Date:** 2026-05-10
**Status:** Approved

## Problem

All game data lives in AsyncStorage, which has a ~6MB cap on iOS. Historical records (player appearances, season stats, fixture results) grow unboundedly as seasons pass. The current workaround is aggressive pruning — `pruneOldSeasons()` keeps only 2 seasons of stats/results, and `slice(-20)` caps development logs. After 5 seasons the player's career history is largely gone.

## Goal

Move all historical, unboundedly-growing data to SQLite (`wk.db`) on-device. No pruning. No caps. Career stats, match history, and full appearance records survive indefinitely.

## Out of Scope

- `worldStore_clubs_*` AsyncStorage keys — these are world-state blobs looked up constantly during simulation; AsyncStorage is the right fit and they are not growing unboundedly.
- `leagueHistoryStore` — bounded at 10 seasons per tier via `partialize`; low priority.
- Any UI redesign — screens wire up to new hooks with minimal change.
- Data migration — clean slate. Pre-migration history (already pruned) is abandoned.

---

## Architecture

### Three Layers

**1. In-memory / Zustand — active game state (unchanged)**

All existing Zustand stores remain: `squadStore`, `coachStore`, `clubStore`, `financeStore`, `inboxStore`, `leagueStore`, etc.

`fixtureStore` is kept as a Zustand store but loses its AsyncStorage `persist` middleware. It becomes a pure in-memory working set for the current season's fixtures, hydrated from SQLite on app boot. SimulationService continues to read fixtures synchronously from Zustand during simulation — no latency change to the hot path.

**2. SQLite `wk.db` — historical records (new)**

Four tables: `appearances`, `player_season_stats`, `fixtures`, `match_results`. All reads and writes go through typed repository functions in `src/db/repositories/`. Nothing outside `src/db/` touches the database directly.

**3. UI reads via TanStack Query (new hooks)**

Any screen needing historical data calls a `useXxx` hook in `src/hooks/db/`. Each hook wraps a repository function as a `useQuery`. Loading states and caching are handled by TanStack Query. Invalidation happens after `SimulationService` completes a batch write.

---

## Database Schema

File: `src/db/schema.ts`

```sql
-- Per-match appearances for AMP squad players only.
-- One row per player per fixture. Append-only.
CREATE TABLE IF NOT EXISTS appearances (
  player_id   TEXT NOT NULL,
  club_id     TEXT NOT NULL,
  league_id   TEXT NOT NULL,
  season      INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  fixture_id  TEXT NOT NULL,
  week        INTEGER NOT NULL,
  goals       INTEGER NOT NULL DEFAULT 0,
  assists     INTEGER NOT NULL DEFAULT 0,
  minutes     INTEGER NOT NULL DEFAULT 90,
  rating      REAL NOT NULL DEFAULT 0,
  position    TEXT,
  PRIMARY KEY (player_id, fixture_id)
);
CREATE INDEX IF NOT EXISTS idx_app_player        ON appearances(player_id);
CREATE INDEX IF NOT EXISTS idx_app_player_season ON appearances(player_id, season);
CREATE INDEX IF NOT EXISTS idx_app_club_season   ON appearances(club_id, season);

-- Aggregated season stats for ALL players (AMP + NPC).
-- Incremented each match via INSERT OR REPLACE (upsert).
CREATE TABLE IF NOT EXISTS player_season_stats (
  player_id   TEXT NOT NULL,
  club_id     TEXT NOT NULL,
  league_id   TEXT NOT NULL,
  season      INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  appearances INTEGER NOT NULL DEFAULT 0,
  goals       INTEGER NOT NULL DEFAULT 0,
  assists     INTEGER NOT NULL DEFAULT 0,
  avg_rating  REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, club_id, league_id, season)
);
CREATE INDEX IF NOT EXISTS idx_pss_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pss_club   ON player_season_stats(club_id);
CREATE INDEX IF NOT EXISTS idx_pss_league ON player_season_stats(league_id, season);

-- All fixtures across all seasons.
-- Written at season start; result columns filled in as matches are played.
CREATE TABLE IF NOT EXISTS fixtures (
  id           TEXT PRIMARY KEY,
  league_id    TEXT NOT NULL,
  season       INTEGER NOT NULL,
  round        INTEGER NOT NULL,
  home_club_id TEXT NOT NULL,
  away_club_id TEXT NOT NULL,
  home_goals   INTEGER,
  away_goals   INTEGER,
  played_at    TEXT,
  synced       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fix_league_season ON fixtures(league_id, season);
CREATE INDEX IF NOT EXISTS idx_fix_home          ON fixtures(home_club_id);
CREATE INDEX IF NOT EXISTS idx_fix_away          ON fixtures(away_club_id);

-- Detailed match records with player lineups (AMP matches only).
-- home_players / away_players stored as JSON arrays.
CREATE TABLE IF NOT EXISTS match_results (
  fixture_id      TEXT PRIMARY KEY,
  season          INTEGER NOT NULL,
  home_club_id    TEXT NOT NULL,
  away_club_id    TEXT NOT NULL,
  home_goals      INTEGER NOT NULL,
  away_goals      INTEGER NOT NULL,
  home_avg_rating REAL,
  away_avg_rating REAL,
  home_players    TEXT NOT NULL,
  away_players    TEXT NOT NULL,
  played_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mr_season    ON match_results(season);
CREATE INDEX IF NOT EXISTS idx_mr_home_club ON match_results(home_club_id);
CREATE INDEX IF NOT EXISTS idx_mr_away_club ON match_results(away_club_id);
```

### `appearances` vs `player_season_stats`

These serve different purposes and are maintained separately:

- `appearances` — AMP players only, per-match rows, used for the player profile history tab. Enables "match by match" breakdown.
- `player_season_stats` — all players (AMP + NPC), running totals, used for golden boot, top assists, career totals. NPC players never have rows in `appearances`; their stats exist only in `player_season_stats`.

AMP player season aggregates are derived from `appearances` at query time via SQL `GROUP BY`. NPC aggregates are maintained incrementally via upsert.

---

## Repository Layer

File tree:
```
src/db/
  client.ts                           — opens wk.db, exports singleton, runs schema
  schema.ts                           — CREATE TABLE / INDEX SQL string
  repositories/
    appearanceRepository.ts
    statsRepository.ts
    fixtureRepository.ts
    matchResultRepository.ts
```

### `src/db/client.ts`

Opens the database using `expo-sqlite`'s `openDatabaseAsync`. Returns a singleton. `SQLiteProvider` in `app/_layout.tsx` wraps the app with `databaseName="wk.db"` and `onInit` runs the schema. Hooks access the instance via `useSQLiteContext()`. Repositories receive `db` as a parameter — no global inside repository files — keeping them testable.

### Repository signatures

```ts
// appearanceRepository.ts
batchInsertAppearances(db, entries: AppearanceEntry[]): Promise<void>
loadPlayerAppearances(db, playerId: string): Promise<PlayerAppearances>
loadClubSeasonAppearances(db, clubId: string, season: number): Promise<AppearanceRow[]>

// statsRepository.ts
batchUpsertStats(db, entries: StatsEntry[]): Promise<void>
getPlayerCareerTotals(db, playerId: string): Promise<PlayerCareerTotals | null>
getPlayerSeasonStats(db, playerId: string): Promise<PlayerSeasonStats[]>
getLeagueTopScorers(db, leagueId: string, season: number, limit?: number): Promise<TopScorerRow[]>
getLeagueTopAssisters(db, leagueId: string, season: number, limit?: number): Promise<TopScorerRow[]>
getClubTopScorer(db, clubId: string): Promise<TopScorerRow | null>
getClubTopAssister(db, clubId: string): Promise<TopScorerRow | null>

// fixtureRepository.ts
batchInsertFixtures(db, fixtures: FixtureRow[]): Promise<void>
loadSeasonFixtures(db, leagueId: string, season: number): Promise<FixtureRow[]>
batchUpdateResults(db, entries: FixtureResultEntry[]): Promise<void>
getUnsyncedResults(db): Promise<FixtureRow[]>
markSynced(db, fixtureIds: string[]): Promise<void>

// matchResultRepository.ts
batchInsertResults(db, records: MatchResultRecord[]): Promise<void>
getByFixtureId(db, fixtureId: string): Promise<MatchResultRecord | null>
getSeasonResults(db, clubId: string, season: number): Promise<MatchResultRecord[]>
```

`batchUpsertStats` uses SQLite's additive upsert syntax so goals/assists/appearances accumulate rather than being overwritten:
```sql
INSERT INTO player_season_stats (player_id, club_id, league_id, season, tier, appearances, goals, assists, avg_rating)
VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
ON CONFLICT(player_id, club_id, league_id, season) DO UPDATE SET
  appearances = appearances + 1,
  goals       = goals + excluded.goals,
  assists     = assists + excluded.assists,
  avg_rating  = (avg_rating * appearances + excluded.avg_rating) / (appearances + 1);
```
This replaces the in-memory merge logic in `batchRecordMatchStats`.

---

## Read Path — TanStack Query Hooks

New hooks in `src/hooks/db/`:
```
usePlayerAppearances.ts      — player profile history tab
usePlayerSeasonStats.ts      — player profile stats rows
usePlayerCareerTotals.ts     — career summary card
useLeagueTopScorers.ts       — golden boot table
useLeagueTopAssisters.ts     — top assists table
useClubTopScorer.ts          — club record panel
useFixtures.ts               — season fixture list
useMatchResult.ts            — individual match detail
```

All follow this pattern:
```ts
export function usePlayerAppearances(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['appearances', playerId],
    queryFn: () => loadPlayerAppearances(db, playerId),
    enabled: !!playerId,
  });
}
```

### Query key conventions
```
['appearances', playerId]
['player-stats', playerId]
['player-career', playerId]
['league-scorers', leagueId, season]
['league-assisters', leagueId, season]
['club-top-scorer', clubId]
['fixtures', leagueId, season]
['match-result', fixtureId]
```

### Invalidation

After `SimulationService` completes a batch write, it invalidates relevant queries via the `queryClient` singleton exported from `src/api/queryClient.ts`:
```ts
queryClient.invalidateQueries({ queryKey: ['league-scorers'] });
queryClient.invalidateQueries({ queryKey: ['league-assisters'] });
queryClient.invalidateQueries({ queryKey: ['appearances'] });
```

### Screens that change
- `app/player/[id].tsx` — `loadPlayerAppearances` (AsyncStorage) → `usePlayerAppearances`
- `src/components/competitions/LeagueTable.tsx` — in-memory `getLeagueStats` → `useLeagueTopScorers` / `useLeagueTopAssisters`
- Any panel showing top scorer / top assister → `useClubTopScorer` / `useClubTopAssister`

---

## Write Path

### SimulationService (current → after)

**Current:**
```ts
useFixtureStore.getState().batchRecordResults(fixtureResultEntries);
useMatchResultStore.getState().batchAddResults(matchResultEntries);
useLeagueStatsStore.getState().batchRecordMatchStats(statsEntries);
useManagerRecordStore.getState().batchRecordResults(managerResultEntries);
await batchAppendAppearances(appearanceEntries);
```

**After:**
```ts
// SQLite writes (historical)
await batchUpdateResults(db, fixtureResultEntries);       // fixtureRepository
await batchInsertResults(db, matchResultEntries);         // matchResultRepository
await batchUpsertStats(db, statsEntries);                 // statsRepository
await batchInsertAppearances(db, appearanceEntries);      // appearanceRepository

// Zustand in-memory only (no persist)
useFixtureStore.getState().applyResultsToMemory(fixtureResultEntries);

// Unchanged
useManagerRecordStore.getState().batchRecordResults(managerResultEntries);
```

`simulateRound()` is already async; no signature change needed.

### GameLoop

AMP match appearances:
```ts
// Before
await batchAppendAppearances(appearanceEntries);
// After
await batchInsertAppearances(db, appearanceEntries);
```

### Season start — fixture bootstrap (SeasonTransitionService)

```ts
await batchInsertFixtures(db, generatedFixtures);          // persist to SQLite
useFixtureStore.getState().setFixtures(generatedFixtures); // load into memory
```

### App boot — hydrating fixtureStore

In `app/_layout.tsx`, after `SQLiteProvider` is ready:
```ts
const fixtures = await loadSeasonFixtures(db, currentLeagueId, currentSeason);
useFixtureStore.getState().setFixtures(fixtures);
```

---

## Installation & Bootstrap

```bash
npx expo install expo-sqlite
```

`app/_layout.tsx` change:
```tsx
import * as SQLite from 'expo-sqlite';
import { CREATE_SCHEMA } from '@/db/schema';

<SQLiteProvider databaseName="wk.db" onInit={async (db) => { await db.execAsync(CREATE_SCHEMA); }}>
  {/* rest of app */}
</SQLiteProvider>
```

### Nuke button update

`app/(tabs)/debug.tsx` — add one line alongside `AsyncStorage.clear()`:
```ts
await SQLite.deleteDatabaseAsync('wk.db');
```

---

## What Gets Deleted

| Removed | Replaced by |
|---|---|
| `src/stores/leagueStatsStore.ts` | `src/db/repositories/statsRepository.ts` |
| `src/stores/matchResultStore.ts` | `src/db/repositories/matchResultRepository.ts` |
| `src/utils/appearanceStorage.ts` | `src/db/repositories/appearanceRepository.ts` |
| `fixtureStore` AsyncStorage `persist` | SQLite + in-memory Zustand (no persist middleware) |
| All `pruneOldSeasons()` calls | Nothing — pruning is gone |
| All `partialize` caps on the above stores | Nothing — no longer needed |

---

## What Stays Untouched

- All active game state Zustand stores
- `worldStore_clubs_*` AsyncStorage keys
- `leagueHistoryStore`
- All API / backend sync logic
- `managerRecordStore`
