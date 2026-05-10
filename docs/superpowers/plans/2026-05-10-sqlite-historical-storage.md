# SQLite Historical Storage Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AsyncStorage-backed leagueStatsStore, matchResultStore, appearanceStorage, and fixtureStore persistence with a single on-device SQLite database (`wk.db`), eliminating all season pruning.

**Architecture:** A `src/db/` layer (schema + singleton client + 4 repositories) handles all SQLite access. Non-React engine code (`SimulationService`, `GameLoop`) calls `getDatabase()` from the client singleton. UI reads via 8 new TanStack Query hooks in `src/hooks/db/`. `fixtureStore` keeps its in-memory Zustand state for simulation hot-path reads, but loses AsyncStorage persistence — SQLite is the durable backing store.

**Tech Stack:** `expo-sqlite` (v14, included in Expo SDK 54), `@tanstack/react-query` v5 (already installed), `zustand` (unchanged for active game state).

---

## File Map

**Create:**
- `src/api/queryClient.ts` — exported QueryClient singleton (extracted from `app/_layout.tsx`)
- `src/db/schema.ts` — `CREATE_SCHEMA` SQL string
- `src/db/client.ts` — `openDatabase`, `setDatabase`, `getDatabase` singleton
- `src/db/types.ts` — shared input/output types for repositories
- `src/db/repositories/appearanceRepository.ts`
- `src/db/repositories/statsRepository.ts`
- `src/db/repositories/fixtureRepository.ts`
- `src/db/repositories/matchResultRepository.ts`
- `src/hooks/db/usePlayerAppearances.ts`
- `src/hooks/db/usePlayerSeasonStats.ts`
- `src/hooks/db/usePlayerCareerTotals.ts`
- `src/hooks/db/useLeagueTopScorers.ts`
- `src/hooks/db/useLeagueTopAssisters.ts`
- `src/hooks/db/useClubTopScorer.ts`
- `src/hooks/db/useFixtures.ts`
- `src/hooks/db/useMatchResult.ts`
- `src/__tests__/db/appearanceRepository.test.ts`
- `src/__tests__/db/statsRepository.test.ts`
- `src/__tests__/db/fixtureRepository.test.ts`
- `src/__tests__/db/matchResultRepository.test.ts`

**Modify:**
- `app/_layout.tsx` — import queryClient from `src/api/queryClient.ts`, add `SQLiteProvider`, add fixture hydration effect
- `src/engine/SimulationService.ts` — replace 5 store writes with repository calls + query invalidation
- `src/engine/GameLoop.ts` — replace `batchAppendAppearances` with `batchInsertAppearances`
- `src/engine/SeasonTransitionService.ts` — add `batchInsertFixtures` call after fixture generation
- `src/stores/fixtureStore.ts` — remove `persist` middleware, add `setFixtures` + `applyResultsToMemory` actions
- `app/player/[id].tsx` — replace `loadPlayerAppearances` (AsyncStorage) with `usePlayerAppearances` hook
- `src/components/competitions/LeagueTable.tsx` — replace in-memory `getLeagueStats` with `useLeagueTopScorers` / `useLeagueTopAssisters`
- `app/(tabs)/debug.tsx` — add `SQLite.deleteDatabaseAsync('wk.db')` to nuke handler

**Delete:**
- `src/stores/leagueStatsStore.ts`
- `src/stores/matchResultStore.ts`
- `src/utils/appearanceStorage.ts`

---

## Task 1: Infrastructure — queryClient singleton, expo-sqlite install, schema, DB client

**Files:**
- Create: `src/api/queryClient.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install expo-sqlite**

```bash
npx expo install expo-sqlite
```

Expected: `expo-sqlite` added to `package.json` dependencies.

- [ ] **Step 2: Extract queryClient singleton**

Create `src/api/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
    mutations: { retry: 1 },
  },
});
```

- [ ] **Step 3: Create `src/db/schema.ts`**

```ts
export const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS appearances (
  player_id   TEXT NOT NULL,
  club_id     TEXT NOT NULL,
  league_id   TEXT NOT NULL,
  season      INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  fixture_id  TEXT NOT NULL,
  week        INTEGER NOT NULL,
  opponent_id TEXT NOT NULL,
  result      TEXT NOT NULL,
  scoreline   TEXT NOT NULL,
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
`;
```

- [ ] **Step 4: Create `src/db/client.ts`**

```ts
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function setDatabase(db: SQLite.SQLiteDatabase): void {
  _db = db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('[db] Database not initialized. SQLiteProvider onInit has not run yet.');
  return _db;
}
```

- [ ] **Step 5: Update `app/_layout.tsx` — import queryClient + add SQLiteProvider**

Find the existing `const queryClient = new QueryClient({...})` block (lines 34–40) and replace with an import. Then wrap `AppNavigator` with `SQLiteProvider`.

```tsx
// Replace the local queryClient declaration with:
import { queryClient } from '@/api/queryClient';
```

```tsx
// Add imports at top of file:
import { SQLiteProvider } from 'expo-sqlite';
import { CREATE_SCHEMA } from '@/db/schema';
import { setDatabase } from '@/db/client';
```

```tsx
// In RootLayout, wrap AppNavigator:
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="wk.db"
        onInit={async (db) => {
          await db.execAsync(CREATE_SCHEMA);
          setDatabase(db);
        }}
      >
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppNavigator />
        </QueryClientProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/api/queryClient.ts src/db/schema.ts src/db/client.ts app/_layout.tsx package.json package-lock.json
git commit -m "feat: install expo-sqlite, add schema, db client, extract queryClient singleton"
```

---

## Task 2: DB Types

**Files:**
- Create: `src/db/types.ts`

- [ ] **Step 1: Create `src/db/types.ts`**

```ts
import type { MatchAppearance, PlayerAppearances } from '@/types/player';
import type { PlayerSeasonStats, PlayerCareerTotals } from '@/types/stats';
import type { Fixture, FixtureResult } from '@/stores/fixtureStore';
import type { MatchResultRecord } from '@/stores/matchResultStore';

// ─── Appearance ───────────────────────────────────────────────────────────────

/** Input row for batchInsertAppearances — richer than the legacy MatchAppearance */
export interface AppearanceInsertEntry {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  tier: number;
  fixtureId: string;
  week: number;
  opponentId: string;
  result: 'win' | 'loss' | 'draw';
  scoreline: string;
  goals: number;
  assists: number;
  minutes: number;
  rating: number;
  position?: string;
}

// Re-export convenience types used by repository consumers
export type { MatchAppearance, PlayerAppearances, PlayerSeasonStats, PlayerCareerTotals };

// ─── Stats ────────────────────────────────────────────────────────────────────

/** Input row for batchUpsertStats — one entry per player per fixture */
export interface StatsInsertEntry {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  tier: number;
  goals: number;
  assists: number;
  rating: number;
}

/** Aggregated row returned by top-scorer / top-assister queries */
export interface TopScorerRow {
  playerId: string;
  goals: number;
  assists: number;
  appearances: number;
  averageRating: number;
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

export interface FixtureResultEntry {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  playedAt: string;
}

// Re-export Fixture so callers don't need to import from fixtureStore
export type { Fixture, FixtureResult, MatchResultRecord };
```

- [ ] **Step 2: Commit**

```bash
git add src/db/types.ts
git commit -m "feat: add db types for repository layer"
```

---

## Task 3: Appearance Repository

**Files:**
- Create: `src/db/repositories/appearanceRepository.ts`
- Create: `src/__tests__/db/appearanceRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/appearanceRepository.test.ts`:

```ts
import {
  batchInsertAppearances,
  loadPlayerAppearances,
} from '@/db/repositories/appearanceRepository';
import type { AppearanceInsertEntry } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const entry: AppearanceInsertEntry = {
  playerId: 'p1', clubId: 'c1', leagueId: 'l1', season: 1, tier: 5,
  fixtureId: 'f1', week: 3, opponentId: 'c2', result: 'win', scoreline: '2-1',
  goals: 1, assists: 0, minutes: 90, rating: 7.5,
};

describe('batchInsertAppearances', () => {
  it('does nothing when entries array is empty', async () => {
    const db = createMockDb();
    await batchInsertAppearances(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('calls runAsync once per entry inside a transaction', async () => {
    const db = createMockDb();
    await batchInsertAppearances(db as any, [entry]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO appearances'),
      ['p1', 'c1', 'l1', 1, 5, 'f1', 3, 'c2', 'win', '2-1', 1, 0, 90, 7.5, null],
    );
  });
});

describe('loadPlayerAppearances', () => {
  it('returns empty object when no rows found', async () => {
    const db = createMockDb();
    const result = await loadPlayerAppearances(db as any, 'p1');
    expect(result).toEqual({});
  });

  it('groups rows into PlayerAppearances structure', async () => {
    const db = createMockDb();
    db.getAllAsync.mockResolvedValue([
      { season: 1, club_id: 'c1', opponent_id: 'c2', result: 'win', scoreline: '2-1', goals: 1, assists: 0, rating: 7.5 },
    ]);
    const result = await loadPlayerAppearances(db as any, 'p1');
    expect(result['Season 1']['c1']).toHaveLength(1);
    expect(result['Season 1']['c1'][0]).toEqual({
      opponentId: 'c2', result: 'win', scoreline: '2-1', goals: 1, assists: 0, rating: 7.5,
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/db/appearanceRepository.test.ts --no-coverage
```

Expected: `Cannot find module '@/db/repositories/appearanceRepository'`

- [ ] **Step 3: Implement `src/db/repositories/appearanceRepository.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppearanceInsertEntry } from '@/db/types';
import type { MatchAppearance, PlayerAppearances } from '@/types/player';

export async function batchInsertAppearances(
  db: SQLiteDatabase,
  entries: AppearanceInsertEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT OR IGNORE INTO appearances
           (player_id, club_id, league_id, season, tier, fixture_id, week,
            opponent_id, result, scoreline, goals, assists, minutes, rating, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.playerId, e.clubId, e.leagueId, e.season, e.tier, e.fixtureId, e.week,
         e.opponentId, e.result, e.scoreline, e.goals, e.assists, e.minutes, e.rating,
         e.position ?? null],
      );
    }
  });
}

interface AppearanceRow {
  season: number;
  club_id: string;
  opponent_id: string;
  result: string;
  scoreline: string;
  goals: number;
  assists: number;
  rating: number;
}

export async function loadPlayerAppearances(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerAppearances> {
  const rows = await db.getAllAsync<AppearanceRow>(
    `SELECT season, club_id, opponent_id, result, scoreline, goals, assists, rating
     FROM appearances WHERE player_id = ? ORDER BY season, week`,
    [playerId],
  );

  const out: PlayerAppearances = {};
  for (const row of rows) {
    const seasonKey = `Season ${row.season}`;
    if (!out[seasonKey]) out[seasonKey] = {};
    if (!out[seasonKey][row.club_id]) out[seasonKey][row.club_id] = [];
    out[seasonKey][row.club_id].push({
      opponentId: row.opponent_id,
      result:     row.result as MatchAppearance['result'],
      scoreline:  row.scoreline,
      goals:      row.goals,
      assists:    row.assists,
      rating:     row.rating,
    });
  }
  return out;
}

export async function loadClubSeasonAppearances(
  db: SQLiteDatabase,
  clubId: string,
  season: number,
): Promise<AppearanceRow[]> {
  return db.getAllAsync<AppearanceRow>(
    `SELECT season, club_id, opponent_id, result, scoreline, goals, assists, rating
     FROM appearances WHERE club_id = ? AND season = ? ORDER BY week`,
    [clubId, season],
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/db/appearanceRepository.test.ts --no-coverage
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/appearanceRepository.ts src/__tests__/db/appearanceRepository.test.ts
git commit -m "feat: add appearanceRepository with SQLite-backed batchInsert + loadPlayerAppearances"
```

---

## Task 4: Stats Repository

**Files:**
- Create: `src/db/repositories/statsRepository.ts`
- Create: `src/__tests__/db/statsRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/statsRepository.test.ts`:

```ts
import {
  batchUpsertStats,
  getPlayerCareerTotals,
  getLeagueTopScorers,
  getClubTopScorer,
} from '@/db/repositories/statsRepository';
import type { StatsInsertEntry } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const entry: StatsInsertEntry = {
  playerId: 'p1', clubId: 'c1', leagueId: 'l1', season: 1, tier: 5,
  goals: 2, assists: 1, rating: 7.5,
};

describe('batchUpsertStats', () => {
  it('does nothing for empty entries', async () => {
    const db = createMockDb();
    await batchUpsertStats(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('calls runAsync with upsert SQL for each entry', async () => {
    const db = createMockDb();
    await batchUpsertStats(db as any, [entry]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(player_id, club_id, league_id, season) DO UPDATE SET'),
      ['p1', 'c1', 'l1', 1, 5, 2, 1, 7.5],
    );
  });
});

describe('getPlayerCareerTotals', () => {
  it('returns null when no rows', async () => {
    const db = createMockDb();
    const result = await getPlayerCareerTotals(db as any, 'p1');
    expect(result).toBeNull();
  });

  it('maps row to PlayerCareerTotals', async () => {
    const db = createMockDb();
    db.getFirstAsync.mockResolvedValue({
      player_id: 'p1', total_goals: 10, total_assists: 5,
      total_appearances: 20, avg_rating: 7.2,
    });
    const result = await getPlayerCareerTotals(db as any, 'p1');
    expect(result).toEqual({
      playerId: 'p1', goals: 10, assists: 5, appearances: 20, averageRating: 7.2,
    });
  });
});

describe('getLeagueTopScorers', () => {
  it('queries with league_id, season, and limit', async () => {
    const db = createMockDb();
    await getLeagueTopScorers(db as any, 'l1', 1, 5);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE league_id = ? AND season = ?'),
      ['l1', 1, 5],
    );
  });
});

describe('getClubTopScorer', () => {
  it('returns null when no rows', async () => {
    const db = createMockDb();
    const result = await getClubTopScorer(db as any, 'c1');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/db/statsRepository.test.ts --no-coverage
```

Expected: `Cannot find module '@/db/repositories/statsRepository'`

- [ ] **Step 3: Implement `src/db/repositories/statsRepository.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { StatsInsertEntry, TopScorerRow } from '@/db/types';
import type { PlayerCareerTotals, PlayerSeasonStats } from '@/types/stats';

export async function batchUpsertStats(
  db: SQLiteDatabase,
  entries: StatsInsertEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `INSERT INTO player_season_stats
           (player_id, club_id, league_id, season, tier, goals, assists, avg_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(player_id, club_id, league_id, season) DO UPDATE SET
           appearances = appearances + 1,
           goals       = goals + excluded.goals,
           assists     = assists + excluded.assists,
           avg_rating  = (avg_rating * appearances + excluded.avg_rating) / (appearances + 1)`,
        [e.playerId, e.clubId, e.leagueId, e.season, e.tier, e.goals, e.assists, e.rating],
      );
    }
  });
}

export async function getPlayerCareerTotals(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerCareerTotals | null> {
  const row = await db.getFirstAsync<{
    player_id: string; total_goals: number; total_assists: number;
    total_appearances: number; avg_rating: number;
  }>(
    `SELECT player_id,
            SUM(goals)       AS total_goals,
            SUM(assists)     AS total_assists,
            SUM(appearances) AS total_appearances,
            CASE WHEN SUM(appearances) > 0
              THEN ROUND(SUM(avg_rating * appearances) / SUM(appearances), 2)
              ELSE 0 END     AS avg_rating
     FROM player_season_stats WHERE player_id = ? GROUP BY player_id`,
    [playerId],
  );
  if (!row) return null;
  return {
    playerId:      row.player_id,
    goals:         row.total_goals,
    assists:       row.total_assists,
    appearances:   row.total_appearances,
    averageRating: row.avg_rating,
  };
}

export async function getPlayerSeasonStats(
  db: SQLiteDatabase,
  playerId: string,
): Promise<PlayerSeasonStats[]> {
  const rows = await db.getAllAsync<{
    player_id: string; club_id: string; league_id: string;
    season: number; tier: number; appearances: number;
    goals: number; assists: number; avg_rating: number;
  }>(
    `SELECT player_id, club_id, league_id, season, tier, appearances, goals, assists, avg_rating
     FROM player_season_stats WHERE player_id = ? ORDER BY season DESC`,
    [playerId],
  );
  return rows.map((r) => ({
    playerId:      r.player_id,
    clubId:        r.club_id,
    leagueId:      r.league_id,
    season:        r.season,
    tier:          r.tier,
    appearances:   r.appearances,
    goals:         r.goals,
    assists:       r.assists,
    averageRating: r.avg_rating,
  }));
}

export async function getLeagueTopScorers(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
  limit: number = 10,
): Promise<TopScorerRow[]> {
  const rows = await db.getAllAsync<{
    player_id: string; goals: number; assists: number;
    appearances: number; avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists,
            SUM(appearances) AS appearances,
            ROUND(SUM(avg_rating * appearances) / NULLIF(SUM(appearances), 0), 2) AS avg_rating
     FROM player_season_stats
     WHERE league_id = ? AND season = ?
     GROUP BY player_id ORDER BY goals DESC LIMIT ?`,
    [leagueId, season, limit],
  );
  return rows.map((r) => ({
    playerId: r.player_id, goals: r.goals, assists: r.assists,
    appearances: r.appearances, averageRating: r.avg_rating ?? 0,
  }));
}

export async function getLeagueTopAssisters(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
  limit: number = 10,
): Promise<TopScorerRow[]> {
  const rows = await db.getAllAsync<{
    player_id: string; goals: number; assists: number;
    appearances: number; avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists,
            SUM(appearances) AS appearances,
            ROUND(SUM(avg_rating * appearances) / NULLIF(SUM(appearances), 0), 2) AS avg_rating
     FROM player_season_stats
     WHERE league_id = ? AND season = ?
     GROUP BY player_id ORDER BY assists DESC LIMIT ?`,
    [leagueId, season, limit],
  );
  return rows.map((r) => ({
    playerId: r.player_id, goals: r.goals, assists: r.assists,
    appearances: r.appearances, averageRating: r.avg_rating ?? 0,
  }));
}

export async function getClubTopScorer(
  db: SQLiteDatabase,
  clubId: string,
): Promise<TopScorerRow | null> {
  const row = await db.getFirstAsync<{
    player_id: string; goals: number; assists: number;
    appearances: number; avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists,
            SUM(appearances) AS appearances,
            ROUND(SUM(avg_rating * appearances) / NULLIF(SUM(appearances), 0), 2) AS avg_rating
     FROM player_season_stats WHERE club_id = ?
     GROUP BY player_id ORDER BY goals DESC LIMIT 1`,
    [clubId],
  );
  if (!row) return null;
  return {
    playerId: row.player_id, goals: row.goals, assists: row.assists,
    appearances: row.appearances, averageRating: row.avg_rating ?? 0,
  };
}

export async function getClubTopAssister(
  db: SQLiteDatabase,
  clubId: string,
): Promise<TopScorerRow | null> {
  const row = await db.getFirstAsync<{
    player_id: string; goals: number; assists: number;
    appearances: number; avg_rating: number;
  }>(
    `SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists,
            SUM(appearances) AS appearances,
            ROUND(SUM(avg_rating * appearances) / NULLIF(SUM(appearances), 0), 2) AS avg_rating
     FROM player_season_stats WHERE club_id = ?
     GROUP BY player_id ORDER BY assists DESC LIMIT 1`,
    [clubId],
  );
  if (!row) return null;
  return {
    playerId: row.player_id, goals: row.goals, assists: row.assists,
    appearances: row.appearances, averageRating: row.avg_rating ?? 0,
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/db/statsRepository.test.ts --no-coverage
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/statsRepository.ts src/__tests__/db/statsRepository.test.ts
git commit -m "feat: add statsRepository with batchUpsertStats, career totals, league top scorers"
```

---

## Task 5: Fixture Repository

**Files:**
- Create: `src/db/repositories/fixtureRepository.ts`
- Create: `src/__tests__/db/fixtureRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/fixtureRepository.test.ts`:

```ts
import {
  batchInsertFixtures,
  loadSeasonFixtures,
  batchUpdateResults,
  getUnsyncedResults,
  markSynced,
} from '@/db/repositories/fixtureRepository';
import type { Fixture } from '@/stores/fixtureStore';
import type { FixtureResultEntry } from '@/db/types';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const fixture: Fixture = {
  id: 'fx1', leagueId: 'l1', season: 1, round: 1,
  homeClubId: 'c1', awayClubId: 'c2', result: null,
};

describe('batchInsertFixtures', () => {
  it('does nothing for empty array', async () => {
    const db = createMockDb();
    await batchInsertFixtures(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('inserts each fixture inside a transaction', async () => {
    const db = createMockDb();
    await batchInsertFixtures(db as any, [fixture]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO fixtures'),
      ['fx1', 'l1', 1, 1, 'c1', 'c2'],
    );
  });
});

describe('loadSeasonFixtures', () => {
  it('queries by league_id and season', async () => {
    const db = createMockDb();
    await loadSeasonFixtures(db as any, 'l1', 1);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE league_id = ? AND season = ?'),
      ['l1', 1],
    );
  });
});

describe('batchUpdateResults', () => {
  it('updates home_goals, away_goals, played_at, synced=0 for each entry', async () => {
    const db = createMockDb();
    const entry: FixtureResultEntry = {
      fixtureId: 'fx1', homeGoals: 2, awayGoals: 1, playedAt: '2026-01-01',
    };
    await batchUpdateResults(db as any, [entry]);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE fixtures SET'),
      [2, 1, '2026-01-01', 'fx1'],
    );
  });
});

describe('markSynced', () => {
  it('updates synced=1 for each id', async () => {
    const db = createMockDb();
    await markSynced(db as any, ['fx1', 'fx2']);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE fixtures SET synced = 1'),
      ['fx1'],
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/db/fixtureRepository.test.ts --no-coverage
```

Expected: `Cannot find module '@/db/repositories/fixtureRepository'`

- [ ] **Step 3: Implement `src/db/repositories/fixtureRepository.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Fixture } from '@/stores/fixtureStore';
import type { FixtureResultEntry } from '@/db/types';

export async function batchInsertFixtures(
  db: SQLiteDatabase,
  fixtures: Fixture[],
): Promise<void> {
  if (fixtures.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const f of fixtures) {
      await db.runAsync(
        `INSERT OR IGNORE INTO fixtures (id, league_id, season, round, home_club_id, away_club_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [f.id, f.leagueId, f.season, f.round, f.homeClubId, f.awayClubId],
      );
    }
  });
}

export async function loadSeasonFixtures(
  db: SQLiteDatabase,
  leagueId: string,
  season: number,
): Promise<Fixture[]> {
  const rows = await db.getAllAsync<{
    id: string; league_id: string; season: number; round: number;
    home_club_id: string; away_club_id: string;
    home_goals: number | null; away_goals: number | null; played_at: string | null;
    synced: number;
  }>(
    `SELECT id, league_id, season, round, home_club_id, away_club_id,
            home_goals, away_goals, played_at, synced
     FROM fixtures WHERE league_id = ? AND season = ? ORDER BY round`,
    [leagueId, season],
  );
  return rows.map((r) => ({
    id:          r.id,
    leagueId:    r.league_id,
    season:      r.season,
    round:       r.round,
    homeClubId:  r.home_club_id,
    awayClubId:  r.away_club_id,
    result: r.home_goals !== null && r.away_goals !== null
      ? { homeGoals: r.home_goals, awayGoals: r.away_goals, playedAt: r.played_at ?? '', synced: r.synced === 1 }
      : null,
  }));
}

export async function batchUpdateResults(
  db: SQLiteDatabase,
  entries: FixtureResultEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of entries) {
      await db.runAsync(
        `UPDATE fixtures SET home_goals = ?, away_goals = ?, played_at = ?, synced = 0
         WHERE id = ?`,
        [e.homeGoals, e.awayGoals, e.playedAt, e.fixtureId],
      );
    }
  });
}

export async function getUnsyncedResults(db: SQLiteDatabase): Promise<Fixture[]> {
  const rows = await db.getAllAsync<{
    id: string; league_id: string; season: number; round: number;
    home_club_id: string; away_club_id: string;
    home_goals: number; away_goals: number; played_at: string;
  }>(
    `SELECT id, league_id, season, round, home_club_id, away_club_id,
            home_goals, away_goals, played_at
     FROM fixtures WHERE synced = 0 AND home_goals IS NOT NULL`,
  );
  return rows.map((r) => ({
    id: r.id, leagueId: r.league_id, season: r.season, round: r.round,
    homeClubId: r.home_club_id, awayClubId: r.away_club_id,
    result: { homeGoals: r.home_goals, awayGoals: r.away_goals, playedAt: r.played_at, synced: false },
  }));
}

export async function markSynced(db: SQLiteDatabase, fixtureIds: string[]): Promise<void> {
  for (const id of fixtureIds) {
    await db.runAsync(`UPDATE fixtures SET synced = 1 WHERE id = ?`, [id]);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/__tests__/db/fixtureRepository.test.ts --no-coverage
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/fixtureRepository.ts src/__tests__/db/fixtureRepository.test.ts
git commit -m "feat: add fixtureRepository — batchInsert, loadSeason, batchUpdateResults, markSynced"
```

---

## Task 6: Match Result Repository

**Files:**
- Create: `src/db/repositories/matchResultRepository.ts`
- Create: `src/__tests__/db/matchResultRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/matchResultRepository.test.ts`:

```ts
import {
  batchInsertResults,
  getByFixtureId,
  getSeasonResults,
} from '@/db/repositories/matchResultRepository';
import type { MatchResultRecord } from '@/stores/matchResultStore';

function createMockDb() {
  return {
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    withTransactionAsync: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

const record: MatchResultRecord = {
  fixtureId: 'fx1', season: 1,
  homeClubId: 'c1', awayClubId: 'c2',
  homeGoals: 2, awayGoals: 1,
  homeAvgRating: 7.1, awayAvgRating: 6.8,
  homePlayers: [], awayPlayers: [],
  playedAt: '2026-01-01',
};

describe('batchInsertResults', () => {
  it('does nothing for empty array', async () => {
    const db = createMockDb();
    await batchInsertResults(db as any, []);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('inserts JSON-serialised player arrays', async () => {
    const db = createMockDb();
    await batchInsertResults(db as any, [record]);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO match_results'),
      ['fx1', 1, 'c1', 'c2', 2, 1, 7.1, 6.8, '[]', '[]', '2026-01-01'],
    );
  });
});

describe('getByFixtureId', () => {
  it('returns null when no row found', async () => {
    const db = createMockDb();
    const result = await getByFixtureId(db as any, 'fx1');
    expect(result).toBeNull();
  });

  it('deserialises home_players and away_players from JSON', async () => {
    const db = createMockDb();
    db.getFirstAsync.mockResolvedValue({
      fixture_id: 'fx1', season: 1,
      home_club_id: 'c1', away_club_id: 'c2',
      home_goals: 2, away_goals: 1,
      home_avg_rating: 7.1, away_avg_rating: 6.8,
      home_players: '[{"id":"p1"}]', away_players: '[]',
      played_at: '2026-01-01',
    });
    const result = await getByFixtureId(db as any, 'fx1');
    expect(result?.homePlayers).toEqual([{ id: 'p1' }]);
    expect(result?.fixtureId).toBe('fx1');
  });
});

describe('getSeasonResults', () => {
  it('queries by club_id (home or away) and season', async () => {
    const db = createMockDb();
    await getSeasonResults(db as any, 'c1', 1);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('(home_club_id = ? OR away_club_id = ?) AND season = ?'),
      ['c1', 'c1', 1],
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/db/matchResultRepository.test.ts --no-coverage
```

Expected: `Cannot find module '@/db/repositories/matchResultRepository'`

- [ ] **Step 3: Implement `src/db/repositories/matchResultRepository.ts`**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { MatchResultRecord } from '@/stores/matchResultStore';

export async function batchInsertResults(
  db: SQLiteDatabase,
  records: MatchResultRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const r of records) {
      await db.runAsync(
        `INSERT OR IGNORE INTO match_results
           (fixture_id, season, home_club_id, away_club_id, home_goals, away_goals,
            home_avg_rating, away_avg_rating, home_players, away_players, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.fixtureId, r.season, r.homeClubId, r.awayClubId,
          r.homeGoals, r.awayGoals, r.homeAvgRating, r.awayAvgRating,
          JSON.stringify(r.homePlayers), JSON.stringify(r.awayPlayers), r.playedAt,
        ],
      );
    }
  });
}

export async function getByFixtureId(
  db: SQLiteDatabase,
  fixtureId: string,
): Promise<MatchResultRecord | null> {
  const row = await db.getFirstAsync<{
    fixture_id: string; season: number;
    home_club_id: string; away_club_id: string;
    home_goals: number; away_goals: number;
    home_avg_rating: number; away_avg_rating: number;
    home_players: string; away_players: string; played_at: string;
  }>(
    `SELECT fixture_id, season, home_club_id, away_club_id, home_goals, away_goals,
            home_avg_rating, away_avg_rating, home_players, away_players, played_at
     FROM match_results WHERE fixture_id = ?`,
    [fixtureId],
  );
  if (!row) return null;
  return {
    fixtureId:      row.fixture_id,
    season:         row.season,
    homeClubId:     row.home_club_id,
    awayClubId:     row.away_club_id,
    homeGoals:      row.home_goals,
    awayGoals:      row.away_goals,
    homeAvgRating:  row.home_avg_rating,
    awayAvgRating:  row.away_avg_rating,
    homePlayers:    JSON.parse(row.home_players),
    awayPlayers:    JSON.parse(row.away_players),
    playedAt:       row.played_at,
  };
}

export async function getSeasonResults(
  db: SQLiteDatabase,
  clubId: string,
  season: number,
): Promise<MatchResultRecord[]> {
  const rows = await db.getAllAsync<{
    fixture_id: string; season: number;
    home_club_id: string; away_club_id: string;
    home_goals: number; away_goals: number;
    home_avg_rating: number; away_avg_rating: number;
    home_players: string; away_players: string; played_at: string;
  }>(
    `SELECT fixture_id, season, home_club_id, away_club_id, home_goals, away_goals,
            home_avg_rating, away_avg_rating, home_players, away_players, played_at
     FROM match_results
     WHERE (home_club_id = ? OR away_club_id = ?) AND season = ?
     ORDER BY played_at`,
    [clubId, clubId, season],
  );
  return rows.map((row) => ({
    fixtureId:      row.fixture_id,
    season:         row.season,
    homeClubId:     row.home_club_id,
    awayClubId:     row.away_club_id,
    homeGoals:      row.home_goals,
    awayGoals:      row.away_goals,
    homeAvgRating:  row.home_avg_rating,
    awayAvgRating:  row.away_avg_rating,
    homePlayers:    JSON.parse(row.home_players),
    awayPlayers:    JSON.parse(row.away_players),
    playedAt:       row.played_at,
  }));
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/__tests__/db/matchResultRepository.test.ts --no-coverage
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/matchResultRepository.ts src/__tests__/db/matchResultRepository.test.ts
git commit -m "feat: add matchResultRepository — batchInsert, getByFixtureId, getSeasonResults"
```

---

## Task 7: TanStack Query Hooks

**Files:**
- Create: `src/hooks/db/usePlayerAppearances.ts`
- Create: `src/hooks/db/usePlayerSeasonStats.ts`
- Create: `src/hooks/db/usePlayerCareerTotals.ts`
- Create: `src/hooks/db/useLeagueTopScorers.ts`
- Create: `src/hooks/db/useLeagueTopAssisters.ts`
- Create: `src/hooks/db/useClubTopScorer.ts`
- Create: `src/hooks/db/useFixtures.ts`
- Create: `src/hooks/db/useMatchResult.ts`

All 8 hooks follow the same pattern: `useSQLiteContext()` + `useQuery`. No tests needed for hooks — they are thin wrappers and are exercised by the UI screens.

- [ ] **Step 1: Create `src/hooks/db/usePlayerAppearances.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { loadPlayerAppearances } from '@/db/repositories/appearanceRepository';

export function usePlayerAppearances(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['appearances', playerId],
    queryFn: () => loadPlayerAppearances(db, playerId),
    enabled: !!playerId,
  });
}
```

- [ ] **Step 2: Create `src/hooks/db/usePlayerSeasonStats.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getPlayerSeasonStats } from '@/db/repositories/statsRepository';

export function usePlayerSeasonStats(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => getPlayerSeasonStats(db, playerId),
    enabled: !!playerId,
  });
}
```

- [ ] **Step 3: Create `src/hooks/db/usePlayerCareerTotals.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getPlayerCareerTotals } from '@/db/repositories/statsRepository';

export function usePlayerCareerTotals(playerId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['player-career', playerId],
    queryFn: () => getPlayerCareerTotals(db, playerId),
    enabled: !!playerId,
  });
}
```

- [ ] **Step 4: Create `src/hooks/db/useLeagueTopScorers.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getLeagueTopScorers } from '@/db/repositories/statsRepository';

export function useLeagueTopScorers(leagueId: string, season: number, limit: number = 10) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['league-scorers', leagueId, season],
    queryFn: () => getLeagueTopScorers(db, leagueId, season, limit),
    enabled: !!leagueId && season > 0,
  });
}
```

- [ ] **Step 5: Create `src/hooks/db/useLeagueTopAssisters.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getLeagueTopAssisters } from '@/db/repositories/statsRepository';

export function useLeagueTopAssisters(leagueId: string, season: number, limit: number = 10) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['league-assisters', leagueId, season],
    queryFn: () => getLeagueTopAssisters(db, leagueId, season, limit),
    enabled: !!leagueId && season > 0,
  });
}
```

- [ ] **Step 6: Create `src/hooks/db/useClubTopScorer.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getClubTopScorer } from '@/db/repositories/statsRepository';

export function useClubTopScorer(clubId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['club-top-scorer', clubId],
    queryFn: () => getClubTopScorer(db, clubId),
    enabled: !!clubId,
  });
}
```

- [ ] **Step 7: Create `src/hooks/db/useFixtures.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { loadSeasonFixtures } from '@/db/repositories/fixtureRepository';

export function useFixtures(leagueId: string, season: number) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['fixtures', leagueId, season],
    queryFn: () => loadSeasonFixtures(db, leagueId, season),
    enabled: !!leagueId && season > 0,
  });
}
```

- [ ] **Step 8: Create `src/hooks/db/useMatchResult.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { getByFixtureId } from '@/db/repositories/matchResultRepository';

export function useMatchResult(fixtureId: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['match-result', fixtureId],
    queryFn: () => getByFixtureId(db, fixtureId),
    enabled: !!fixtureId,
  });
}
```

- [ ] **Step 9: Commit**

```bash
git add src/hooks/db/
git commit -m "feat: add 8 TanStack Query hooks for SQLite historical data reads"
```

---

## Task 8: SimulationService — Write Path Migration

**Files:**
- Modify: `src/engine/SimulationService.ts`

The flush block at lines 316–321 (approximately) is the only section that changes. The simulation logic above it is untouched.

- [ ] **Step 1: Replace imports at top of SimulationService**

Remove these imports:
```ts
import { useMatchResultStore } from '@/stores/matchResultStore';
import { useLeagueStatsStore } from '@/stores/leagueStatsStore';
import type { BulkStatsEntry } from '@/stores/leagueStatsStore';
import type { MatchResultRecord } from '@/stores/matchResultStore';
import { batchAppendAppearances } from '@/utils/appearanceStorage';
```

Add these imports:
```ts
import { getDatabase } from '@/db/client';
import { batchInsertAppearances } from '@/db/repositories/appearanceRepository';
import { batchUpsertStats } from '@/db/repositories/statsRepository';
import { batchUpdateResults, } from '@/db/repositories/fixtureRepository';
import { batchInsertResults } from '@/db/repositories/matchResultRepository';
import type { AppearanceInsertEntry, StatsInsertEntry, FixtureResultEntry } from '@/db/types';
import type { MatchResultRecord } from '@/stores/matchResultStore';
import { queryClient } from '@/api/queryClient';
```

- [ ] **Step 2: Update the `appearanceEntries` array type and push call**

Find the declaration (around line 89):
```ts
const appearanceEntries: Array<{ playerId: string; clubId: string; season: number; appearance: MatchAppearance }> = [];
```

Replace with:
```ts
const appearanceEntries: AppearanceInsertEntry[] = [];
```

Find where `appearanceEntries.push` is called (around line 208) and update it to include the extra fields. You'll need `leagueId`, `tier`, `fixtureId`, and `week` — these are available in the surrounding context:

```ts
// Before:
appearanceEntries.push({
  playerId:   pp.player.id,
  clubId:     userClub.id,
  season:     fixture.season,
  appearance: {
    opponentId, result: matchResult, scoreline,
    rating: pp.rating, goals: pp.goal, assists: pp.assist,
  },
});

// After:
appearanceEntries.push({
  playerId:   pp.player.id,
  clubId:     userClub.id,
  leagueId,
  season:     fixture.season,
  tier,
  fixtureId:  fixture.id,
  week:       userClub.weekNumber ?? 0,
  opponentId,
  result:     matchResult,
  scoreline,
  goals:      pp.goal,
  assists:    pp.assist,
  minutes:    90,
  rating:     pp.rating,
  position:   pp.player.position,
});
```

- [ ] **Step 3: Update the `statsEntries` type**

Find the declaration:
```ts
const statsEntries: BulkStatsEntry[] = [];
```

Replace with:
```ts
const statsEntries: StatsInsertEntry[] = [];
```

The push calls already have the right shape — just verify the field names match `StatsInsertEntry`. The existing push is:
```ts
statsEntries.push({ playerId: pp.id, clubId: fixture.homeClubId, leagueId, season, tier, goals: pp.goals, assists: pp.assists, rating: pp.rating });
```
This matches `StatsInsertEntry` exactly. No change needed.

- [ ] **Step 4: Update the `fixtureResultEntries` type**

Find:
```ts
const fixtureResultEntries: Array<{ fixtureId: string; result: { homeGoals: number; awayGoals: number; playedAt: string } }> = [];
```

Replace with:
```ts
const fixtureResultEntries: FixtureResultEntry[] = [];
```

Then find the `.push` for this array (around line 108) and update its shape:
```ts
// Before:
fixtureResultEntries.push({
  fixtureId: fixture.id,
  result: { homeGoals: result.homeScore, awayGoals: result.awayScore, playedAt: new Date().toISOString() },
});

// After:
fixtureResultEntries.push({
  fixtureId: fixture.id,
  homeGoals:  result.homeScore,
  awayGoals:  result.awayScore,
  playedAt:   new Date().toISOString(),
});
```

- [ ] **Step 5: Replace the flush block**

Find (around line 316):
```ts
useFixtureStore.getState().batchRecordResults(fixtureResultEntries);
useMatchResultStore.getState().batchAddResults(matchResultEntries);
useLeagueStatsStore.getState().batchRecordMatchStats(statsEntries);
useClubStatsStore.getState().batchUpdateFromResults(clubResultEntries);
useManagerRecordStore.getState().batchRecordResults(managerResultEntries);
await batchAppendAppearances(appearanceEntries);
```

Replace with:
```ts
const db = getDatabase();
await batchUpdateResults(db, fixtureResultEntries);
await batchInsertResults(db, matchResultEntries);
await batchUpsertStats(db, statsEntries);
await batchInsertAppearances(db, appearanceEntries);
useFixtureStore.getState().applyResultsToMemory(fixtureResultEntries);
useClubStatsStore.getState().batchUpdateFromResults(clubResultEntries);
useManagerRecordStore.getState().batchRecordResults(managerResultEntries);

queryClient.invalidateQueries({ queryKey: ['league-scorers'] });
queryClient.invalidateQueries({ queryKey: ['league-assisters'] });
queryClient.invalidateQueries({ queryKey: ['appearances'] });
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/SimulationService.ts
git commit -m "feat: migrate SimulationService flush block from Zustand stores to SQLite repositories"
```

---

## Task 9: GameLoop + SeasonTransitionService Write Path

**Files:**
- Modify: `src/engine/GameLoop.ts`
- Modify: `src/engine/SeasonTransitionService.ts`

- [ ] **Step 1: Update GameLoop appearance write**

In `src/engine/GameLoop.ts`, find the import:
```ts
import { batchAppendAppearances } from '@/utils/appearanceStorage';
```
Replace with:
```ts
import { getDatabase } from '@/db/client';
import { batchInsertAppearances } from '@/db/repositories/appearanceRepository';
import type { AppearanceInsertEntry } from '@/db/types';
```

Find where `batchAppendAppearances` is called. It receives entries shaped as `{ playerId, clubId, season, appearance: MatchAppearance }`. Replace the entry shape and call:

```ts
// Find the old array declaration — something like:
const appearanceEntries: Array<{ playerId: string; clubId: string; season: number; appearance: MatchAppearance }> = [];

// Replace with:
const appearanceEntries: AppearanceInsertEntry[] = [];
```

Where entries are pushed, add the new fields. The push will be near AMP match processing. You need `leagueId`, `tier`, `fixtureId`, `week` — read these from the fixture and club context available in GameLoop:

```ts
appearanceEntries.push({
  playerId:   player.id,
  clubId:     club.id,
  leagueId:   currentLeagueId,   // from useLeagueStore.getState().league?.id ?? ''
  season:     currentSeason,     // from useLeagueStore.getState().currentSeason
  tier:       ampLeagueTier,     // numeric tier from worldStore.leagues
  fixtureId:  fixture.id,
  week:       weekNumber,
  opponentId: opponentClubId,
  result:     matchResult,
  scoreline,
  goals:      player.goals ?? 0,
  assists:    player.assists ?? 0,
  minutes:    90,
  rating:     player.rating ?? 0,
  position:   player.position,
});
```

Replace the `batchAppendAppearances` call:
```ts
// Before:
await batchAppendAppearances(appearanceEntries);

// After:
const db = getDatabase();
await batchInsertAppearances(db, appearanceEntries);
```

- [ ] **Step 2: Update SeasonTransitionService fixture bootstrap**

In `src/engine/SeasonTransitionService.ts`, find where `generateFixtures` or `generateFixturesFromWorldLeague` is called on the fixture store after a new season begins. Add a SQLite write immediately after:

```ts
// Add imports at top of SeasonTransitionService.ts:
import { getDatabase } from '@/db/client';
import { batchInsertFixtures } from '@/db/repositories/fixtureRepository';
```

Find the call site where fixtures are generated (search for `useFixtureStore.getState().generateFixtures` or `generateFixturesFromWorldLeague`):

```ts
// After the existing generateFixtures call, add:
const generatedFixtures = useFixtureStore.getState().fixtures.filter(
  (f) => f.leagueId === league.id && f.season === season,
);
const db = getDatabase();
await batchInsertFixtures(db, generatedFixtures);
```

Note: `SeasonTransitionService` functions may need to become `async` if they aren't already. Check the function signature and update callers in `GameLoop.ts` accordingly with `await`.

- [ ] **Step 3: Commit**

```bash
git add src/engine/GameLoop.ts src/engine/SeasonTransitionService.ts
git commit -m "feat: migrate GameLoop + SeasonTransitionService appearance/fixture writes to SQLite"
```

---

## Task 10: fixtureStore Cleanup + _layout.tsx Hydration

**Files:**
- Modify: `src/stores/fixtureStore.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add `setFixtures` and `applyResultsToMemory` to fixtureStore interface**

In `src/stores/fixtureStore.ts`, add to the `FixtureActions` interface:

```ts
/** Replace in-memory fixtures (called on app boot to hydrate from SQLite). */
setFixtures: (fixtures: Fixture[]) => void;
/**
 * Apply results to in-memory fixtures only — no persistence.
 * SQLite is the durable backing store; this keeps the working set in sync
 * for the simulation hot path.
 */
applyResultsToMemory: (entries: Array<{ fixtureId: string; homeGoals: number; awayGoals: number; playedAt: string }>) => void;
```

- [ ] **Step 2: Implement the two new actions**

Inside the `create` callback, add:

```ts
setFixtures: (fixtures) => set({ fixtures }),

applyResultsToMemory: (entries) =>
  set((state) => ({
    fixtures: state.fixtures.map((f) => {
      const entry = entries.find((e) => e.fixtureId === f.id);
      if (!entry) return f;
      return {
        ...f,
        result: { homeGoals: entry.homeGoals, awayGoals: entry.awayGoals, playedAt: entry.playedAt, synced: false },
      };
    }),
  })),
```

- [ ] **Step 3: Remove AsyncStorage persistence from fixtureStore**

Find the `persist(...)` wrapper call. Remove it — replace:

```ts
export const useFixtureStore = create<FixtureStore>()(
  persist(
    (set, get) => ({ ... }),
    { name: 'fixture-store', storage: zustandStorage },
  ),
);
```

With:
```ts
export const useFixtureStore = create<FixtureStore>()(
  (set, get) => ({ ... }),
);
```

Also remove the `zustandStorage` import from this file if it's no longer used elsewhere in it.

- [ ] **Step 4: Add fixture hydration to `app/_layout.tsx`**

Inside `AppNavigator` (or a dedicated `useEffect` near app boot), add a hydration effect. This runs once after the DB is ready and the current league/season are known:

```tsx
// Add imports:
import { useSQLiteContext } from 'expo-sqlite';
import { loadSeasonFixtures } from '@/db/repositories/fixtureRepository';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useLeagueStore } from '@/stores/leagueStore';

// Inside AppNavigator, after isReady check:
const db = useSQLiteContext();
const currentLeagueId = useLeagueStore((s) => s.league?.id);
const currentSeason   = useLeagueStore((s) => s.currentSeason);

useEffect(() => {
  if (!isReady || !currentLeagueId) return;
  loadSeasonFixtures(db, currentLeagueId, currentSeason).then((fixtures) => {
    useFixtureStore.getState().setFixtures(fixtures);
  });
}, [isReady, currentLeagueId, currentSeason]);
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/fixtureStore.ts app/_layout.tsx
git commit -m "feat: remove fixtureStore AsyncStorage persist, add SQLite hydration on app boot"
```

---

## Task 11: UI Screen Migrations

**Files:**
- Modify: `app/player/[id].tsx`
- Modify: `src/components/competitions/LeagueTable.tsx`

- [ ] **Step 1: Update `app/player/[id].tsx` — replace AsyncStorage appearance load with hook**

Find the existing `useEffect` that calls `loadPlayerAppearances`:

```ts
// Find and remove this import:
import { loadPlayerAppearances } from '@/utils/appearanceStorage';
// Find and remove the useState for appearances:
const [appearances, setAppearances] = useState<PlayerAppearances>({});
// Find and remove the useEffect that loads appearances.
```

Replace with the hook:

```tsx
// Add import:
import { usePlayerAppearances } from '@/hooks/db/usePlayerAppearances';

// In the component body, replace the useState+useEffect pair with:
const { data: appearances = {} } = usePlayerAppearances(player.id);
```

Everything downstream that reads `appearances` continues to work — same `PlayerAppearances` shape.

- [ ] **Step 2: Update `src/components/competitions/LeagueTable.tsx` — top scorers/assisters**

Find the sections that call `useLeagueStatsStore` to get top scorers / assisters / golden boot data. The exact code will vary — look for calls like:
```ts
useLeagueStatsStore((s) => s.getLeagueStats(leagueId))
```

Replace with the new hooks:
```tsx
// Add imports:
import { useLeagueTopScorers } from '@/hooks/db/useLeagueTopScorers';
import { useLeagueTopAssisters } from '@/hooks/db/useLeagueTopAssisters';

// Replace Zustand selector calls:
const { data: topScorers = [] }   = useLeagueTopScorers(leagueId, season, 8);
const { data: topAssisters = [] } = useLeagueTopAssisters(leagueId, season, 8);
```

The `topScorers` and `topAssisters` arrays contain `TopScorerRow` objects with `playerId`, `goals`, `assists`, `appearances`, `averageRating`. Update any rendering code to use `row.playerId` instead of `row.playerId` (same field name), and `row.goals`/`row.assists` directly.

- [ ] **Step 3: Run the app and verify**

```bash
npx expo start --ios
```

Navigate to a player profile — appearance history should load. Navigate to Competition > League — golden boot / top assists tables should render (may be empty until a simulation runs).

- [ ] **Step 4: Commit**

```bash
git add app/player/\[id\].tsx src/components/competitions/LeagueTable.tsx
git commit -m "feat: migrate player profile + LeagueTable to SQLite-backed hooks"
```

---

## Task 12: Delete Old Code + Nuke Button Update

**Files:**
- Delete: `src/stores/leagueStatsStore.ts`
- Delete: `src/stores/matchResultStore.ts`
- Delete: `src/utils/appearanceStorage.ts`
- Modify: `app/(tabs)/debug.tsx`

- [ ] **Step 1: Find and remove all remaining imports of deleted files**

```bash
grep -r "leagueStatsStore\|matchResultStore\|appearanceStorage" src/ app/ --include="*.ts" --include="*.tsx" -l
```

For each file listed, remove the import and any usage. By this task, the only remaining references should be in test files (which can also be deleted) or dead code. Common places to check:
- `src/engine/SeasonTransitionService.ts` — may still call `pruneOldSeasons`
- `src/stores/resetAllStores.ts` — likely calls `resetStats()` from leagueStatsStore

Update `src/stores/resetAllStores.ts`: remove the import + call to `useLeagueStatsStore.getState().resetStats()` and `useMatchResultStore.getState()...`.

- [ ] **Step 2: Delete the three files**

```bash
rm src/stores/leagueStatsStore.ts
rm src/stores/matchResultStore.ts
rm src/utils/appearanceStorage.ts
```

- [ ] **Step 3: Update the Nuke button in `app/(tabs)/debug.tsx`**

Find the `handleNuke` callback:

```ts
onPress: async () => {
  await AsyncStorage.clear();
  await Updates.reloadAsync();
},
```

Replace with:

```ts
import * as SQLite from 'expo-sqlite';

// In handleNuke:
onPress: async () => {
  await AsyncStorage.clear();
  await SQLite.deleteDatabaseAsync('wk.db');
  await Updates.reloadAsync();
},
```

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: existing tests pass, 4 new repository test suites pass, no import errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: remove leagueStatsStore, matchResultStore, appearanceStorage — fully replaced by SQLite repositories"
```

---

## Self-Review Checklist

- [x] **Schema** — Task 1 creates `schema.ts` with all 4 tables + indexes, including `opponent_id`/`result`/`scoreline` columns needed to reconstruct `MatchAppearance`
- [x] **DB client singleton** — Task 1 creates `client.ts`; `setDatabase` called from `SQLiteProvider.onInit`; `getDatabase` used in Tasks 8, 9
- [x] **queryClient extracted** — Task 1 extracts to `src/api/queryClient.ts`; SimulationService uses it for invalidation in Task 8
- [x] **All 4 repositories** — Tasks 3–6, each with tests
- [x] **All 8 hooks** — Task 7
- [x] **SimulationService write path** — Task 8, including updated `AppearanceInsertEntry` shape with new fields
- [x] **GameLoop write path** — Task 9
- [x] **SeasonTransitionService fixture bootstrap** — Task 9
- [x] **fixtureStore persist removed** — Task 10
- [x] **App boot hydration** — Task 10
- [x] **UI screens** — Task 11 (player/[id].tsx + LeagueTable.tsx)
- [x] **Old stores deleted** — Task 12
- [x] **Nuke button** — Task 12
- [x] **No pruning calls remain** — `pruneOldSeasons` is only on `leagueStatsStore` and `matchResultStore`, which are deleted in Task 12; `pruneAppearancesBefore` is in `appearanceStorage.ts`, also deleted
- [x] **Type names consistent** — `AppearanceInsertEntry`, `StatsInsertEntry`, `FixtureResultEntry`, `TopScorerRow` defined in Task 2 and used consistently in Tasks 3–9
