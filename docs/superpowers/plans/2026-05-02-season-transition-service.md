# Season Transition Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract end-of-season logic from `SeasonEndOverlay.tsx` into a testable `SeasonTransitionService.ts` engine service, and add a `HISTORY` tab to the Competition hub.

**Architecture:** A pure TypeScript service module in `src/engine/` exposes individually exported functions (standings builder, pyramid payload builder, league snapshot builder, store-mutating steps) composed by a single `performSeasonTransition(snapshot)` orchestrator. `SeasonEndOverlay` becomes a thin UI shell. `SeasonHistory.tsx` reads from `leagueHistoryStore` to display past seasons.

**Tech Stack:** TypeScript, Zustand (store access via `.getState()`), React Native (UI components), Jest (tests with `jest.mock`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/engine/SeasonTransitionService.ts` | **Create** | All season-end business logic and orchestration |
| `src/__tests__/engine/SeasonTransitionService.test.ts` | **Create** | Unit tests for every exported function |
| `src/components/SeasonEndOverlay.tsx` | **Modify** | Remove logic, import from service, use `SeasonStanding` type |
| `src/components/competitions/SeasonHistory.tsx` | **Create** | History tab UI — reads from `leagueHistoryStore` |
| `app/(tabs)/competitions.tsx` | **Modify** | Add `HISTORY` to tab list, render `SeasonHistory` pane |

---

## Task 1: Service — types + `buildLeagueStandings`

**Files:**
- Create: `src/engine/SeasonTransitionService.ts`
- Create: `src/__tests__/engine/SeasonTransitionService.test.ts`

- [ ] **Step 1: Write the failing test for `buildLeagueStandings`**

Create `src/__tests__/engine/SeasonTransitionService.test.ts`:

```typescript
import { buildLeagueStandings } from '@/engine/SeasonTransitionService';

const mockFixtures = [
  // c1 beat c2 3-0
  { id: 'f1', leagueId: 'L1', season: 1, round: 1, homeClubId: 'c1', awayClubId: 'c2',
    result: { homeGoals: 3, awayGoals: 0, playedAt: '', synced: true } },
  // c3 beat c2 1-0
  { id: 'f2', leagueId: 'L1', season: 1, round: 2, homeClubId: 'c3', awayClubId: 'c2',
    result: { homeGoals: 1, awayGoals: 0, playedAt: '', synced: true } },
  // c1 drew c3 0-0
  { id: 'f3', leagueId: 'L1', season: 1, round: 3, homeClubId: 'c1', awayClubId: 'c3',
    result: { homeGoals: 0, awayGoals: 0, playedAt: '', synced: true } },
  // Different league — must be ignored
  { id: 'f4', leagueId: 'OTHER', season: 1, round: 1, homeClubId: 'c1', awayClubId: 'c2',
    result: { homeGoals: 5, awayGoals: 0, playedAt: '', synced: true } },
];

jest.mock('@/stores/fixtureStore', () => ({
  useFixtureStore: { getState: () => ({ fixtures: mockFixtures }) },
}));

jest.mock('@/stores/clubStore', () => ({
  useClubStore: { getState: () => ({ club: { id: 'amp-not-in-this-league' } }) },
}));

describe('buildLeagueStandings', () => {
  it('sorts clubs by pts then gd then gf', () => {
    // c1: 4pts (W+D), gd +3; c3: 4pts (W+D), gd +1; c2: 0pts, gd -4
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[0].clubId).toBe('c1');
    expect(standings[1].clubId).toBe('c3');
    expect(standings[2].clubId).toBe('c2');
  });

  it('marks last-place club as relegated', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[2].relegated).toBe(true);
    expect(standings[0].relegated).toBe(false);
  });

  it('marks top N clubs as promoted when promotionSpots set', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings[0].promoted).toBe(true);
    expect(standings[1].promoted).toBe(false);
  });

  it('marks nobody as promoted when promotionSpots is null', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], null, 1);
    expect(standings.every((s) => !s.promoted)).toBe(true);
  });

  it('marks AMP club entry correctly', () => {
    // Override mock to put c1 as AMP
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'c1' } });
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    expect(standings.find((s) => s.clubId === 'c1')?.isAmp).toBe(true);
    expect(standings.find((s) => s.clubId === 'c2')?.isAmp).toBe(false);
    // Restore
    useClubStore.getState = () => ({ club: { id: 'amp-not-in-this-league' } });
  });

  it('ignores fixtures from other leagues and seasons', () => {
    const standings = buildLeagueStandings('L1', ['c1', 'c2', 'c3'], 1, 1);
    // c1 should only have stats from L1/season1 — not inflated by the OTHER-league fixture
    expect(standings[0].clubId).toBe('c1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | head -30
```

Expected: `Cannot find module '@/engine/SeasonTransitionService'`

- [ ] **Step 3: Create `SeasonTransitionService.ts` with types and `buildLeagueStandings`**

Create `src/engine/SeasonTransitionService.ts`:

```typescript
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { concludeSeason } from '@/api/endpoints/season';
import type { PyramidStanding, PyramidLeague } from '@/api/endpoints/season';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
import type { SeasonUpdateLeague, WorldLeague } from '@/types/world';
import { uuidv7 } from '@/utils/uuidv7';
import { penceToPounds } from '@/utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Pre-transition snapshot built by SeasonEndOverlay before any store mutations.
 * Passed as the single argument to performSeasonTransition.
 */
export interface SeasonTransitionSnapshot {
  currentLeague:    LeagueSnapshot;
  currentSeason:    number;
  finalPosition:    number;
  promoted:         boolean;
  relegated:        boolean;
  weekNumber:       number;
  // AMP's season stats for the conclude-season API payload
  gamesPlayed:      number;
  wins:             number;
  draws:            number;
  losses:           number;
  goalsFor:         number;
  goalsAgainst:     number;
  points:           number;
  // Full captured standings table for history recording
  displayStandings: SeasonStanding[];
}

/**
 * Per-club display entry captured from the live standings useMemo in SeasonEndOverlay.
 * Replaces the local Standing interface in that component.
 */
export interface SeasonStanding {
  id:           string;
  name:         string;
  primaryColor: string;
  pts:          number;
  gd:           number;
  gf:           number;
  ga:           number;
  played:       number;
  wins:         number;
  draws:        number;
  losses:       number;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const VALID_REP_TIERS = ['local', 'regional', 'national', 'elite'] as const;

const LEAGUE_TIER_REP_CAP: Record<string, number> = {
  local: 14, regional: 39, national: 74, elite: 100,
};

// ─── Read-only helpers ────────────────────────────────────────────────────────

/**
 * Derive PyramidStanding[] for a league from recorded fixture results.
 * Reads fixtureStore (read-only). Works for both the AMP's league and NPC leagues.
 * relegated: true is set only for the last-place club.
 * promoted: true is set for clubs finishing in the top `promotionSpots` positions.
 */
export function buildLeagueStandings(
  leagueId: string,
  clubIds: string[],
  promotionSpots: number | null,
  season: number,
): PyramidStanding[] {
  const ampClubId   = useClubStore.getState().club.id;
  const allFixtures = useFixtureStore.getState().fixtures;

  const pts: Record<string, number> = {};
  const gd:  Record<string, number> = {};
  const gf:  Record<string, number> = {};
  for (const id of clubIds) { pts[id] = 0; gd[id] = 0; gf[id] = 0; }

  for (const f of allFixtures) {
    if (f.leagueId !== leagueId || f.season !== season || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    if (!(f.homeClubId in pts) || !(f.awayClubId in pts)) continue;
    pts[f.homeClubId] += homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    pts[f.awayClubId] += awayGoals > homeGoals ? 3 : homeGoals === awayGoals ? 1 : 0;
    gd[f.homeClubId]  += homeGoals - awayGoals;
    gd[f.awayClubId]  += awayGoals - homeGoals;
    gf[f.homeClubId]  += homeGoals;
    gf[f.awayClubId]  += awayGoals;
  }

  const sorted = clubIds.slice().sort(
    (a, b) => (pts[b] - pts[a]) || (gd[b] - gd[a]) || (gf[b] - gf[a]),
  );
  const total = sorted.length;
  return sorted.map((clubId, i) => ({
    clubId,
    isAmp:     clubId === ampClubId,
    promoted:  promotionSpots != null && (i + 1) <= promotionSpots,
    relegated: (i + 1) === total,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | tail -15
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: add SeasonTransitionService with buildLeagueStandings and exported types"
```

---

## Task 2: `buildPyramidPayload` + `buildLeagueSnapshot`

**Files:**
- Modify: `src/engine/SeasonTransitionService.ts`
- Modify: `src/__tests__/engine/SeasonTransitionService.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/__tests__/engine/SeasonTransitionService.test.ts`:

```typescript
import {
  buildLeagueStandings,
  buildPyramidPayload,
  buildLeagueSnapshot,
} from '@/engine/SeasonTransitionService';
import type { WorldLeague, SeasonUpdateLeague } from '@/types/world';

// --- buildPyramidPayload ---

jest.mock('@/stores/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      clubs: {
        'c1': { id: 'c1', name: 'Club One', reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#000', stadiumName: null, facilities: {} },
      },
      leagues: [],
    }),
  },
}));

const mockWorldLeagues: WorldLeague[] = [
  { id: 'L1', tier: 1, name: 'Top', country: 'BR', promotionSpots: null, reputationTier: 'elite', clubIds: ['c2', 'c3'] },
  { id: 'L2', tier: 2, name: 'Second', country: 'BR', promotionSpots: 1, reputationTier: 'national', clubIds: ['c4', 'c5'] },
];

describe('buildPyramidPayload', () => {
  beforeEach(() => {
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1' } });
  });

  it('returns one PyramidLeague per world league', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    expect(payload).toHaveLength(2);
    expect(payload.map((l) => l.leagueId)).toEqual(['L1', 'L2']);
  });

  it('includes AMP club id in its league clubIds', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    const ampLeague = payload.find((l) => l.leagueId === 'L2')!;
    // AMP standings will include amp1 among entries
    expect(ampLeague.standings.some((s) => s.clubId === 'amp1')).toBe(true);
  });

  it('does not include AMP in other league standings', () => {
    const payload = buildPyramidPayload('L2', mockWorldLeagues, 1);
    const otherLeague = payload.find((l) => l.leagueId === 'L1')!;
    expect(otherLeague.standings.some((s) => s.clubId === 'amp1')).toBe(false);
  });
});

// --- buildLeagueSnapshot ---

const mockSeasonLeague: SeasonUpdateLeague = {
  id: 'L8',
  tier: 8,
  name: 'League 8',
  country: 'BR',
  promotionSpots: 1,
  reputationTier: 'local',
  tvDeal: 500000,
  sponsorPot: 18329782,
  prizeMoney: 500000,
  leaguePositionPot: 500000,
  leaguePositionDecreasePercent: 8,
  clubs: [
    { clubId: 'c1', isAmp: false, promoted: false, relegated: true },
    { clubId: 'amp1', isAmp: true, promoted: false, relegated: false },
    { clubId: 'c99', isAmp: false, promoted: true, relegated: false },
  ],
  fixtures: [],
};

describe('buildLeagueSnapshot', () => {
  it('excludes the AMP club from the clubs array', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.clubs.every((c) => c.id !== 'amp1')).toBe(true);
  });

  it('includes all NPC clubs regardless of promoted/relegated flags', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.clubs).toHaveLength(2);
    expect(snapshot.clubs.find((c) => c.id === 'c1')).toBeDefined();
    expect(snapshot.clubs.find((c) => c.id === 'c99')).toBeDefined();
  });

  it('sets correct league metadata', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    expect(snapshot.id).toBe('L8');
    expect(snapshot.tier).toBe(8);
    expect(snapshot.season).toBe(2);
    expect(snapshot.reputationTier).toBe('local');
    expect(snapshot.reputationCap).toBe(14);
  });

  it('uses worldStore club data for name and colors', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    const club = snapshot.clubs.find((c) => c.id === 'c1')!;
    expect(club.name).toBe('Club One');
    expect(club.primaryColor).toBe('#ff0000');
  });

  it('falls back to clubId as name when worldStore has no data', () => {
    const snapshot = buildLeagueSnapshot(mockSeasonLeague, 2);
    const unknown = snapshot.clubs.find((c) => c.id === 'c99')!;
    expect(unknown.name).toBe('c99');
    expect(unknown.primaryColor).toBe('#888888');
  });
});
```

- [ ] **Step 2: Run test to verify new tests fail**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | tail -20
```

Expected: failures for `buildPyramidPayload` and `buildLeagueSnapshot` (not yet defined)

- [ ] **Step 3: Implement `buildPyramidPayload` and `buildLeagueSnapshot`**

Append to `src/engine/SeasonTransitionService.ts` after `buildLeagueStandings`:

```typescript
/**
 * Build the full pyramid payload for the conclude-season API call.
 * Includes the AMP club in its own league's clubIds.
 * Reads clubStore and fixtureStore (read-only).
 */
export function buildPyramidPayload(
  currentLeagueId: string,
  worldLeagues: WorldLeague[],
  season: number,
): PyramidLeague[] {
  const ampClubId = useClubStore.getState().club.id;
  return worldLeagues.map((wLeague) => {
    const clubIds = wLeague.id === currentLeagueId
      ? [...wLeague.clubIds, ampClubId]
      : wLeague.clubIds;
    return {
      leagueId:  wLeague.id,
      standings: buildLeagueStandings(wLeague.id, clubIds, wLeague.promotionSpots, season),
    };
  });
}

/**
 * Build a LeagueSnapshot for leagueStore from a SeasonUpdateLeague API entry.
 * Each club appears in exactly one league in the backend response — no deduplication needed.
 * AMP club (isAmp: true) is excluded from the clubs array.
 * promoted/relegated flags have zero effect on league membership.
 */
export function buildLeagueSnapshot(
  seasonLeague: SeasonUpdateLeague,
  season: number,
): LeagueSnapshot {
  const repTier = (VALID_REP_TIERS as readonly string[]).includes(seasonLeague.reputationTier ?? '')
    ? (seasonLeague.reputationTier as LeagueSnapshot['reputationTier'])
    : null;

  const worldClubs = useWorldStore.getState().clubs;
  const clubs: ClubSnapshot[] = seasonLeague.clubs
    .filter((slim) => !slim.isAmp)
    .map((slim) => {
      const full = worldClubs[slim.clubId];
      return full
        ? {
            id:             full.id,
            name:           full.name,
            reputation:     full.reputation,
            tier:           seasonLeague.tier,
            primaryColor:   full.primaryColor,
            secondaryColor: full.secondaryColor,
            stadiumName:    full.stadiumName,
            facilities:     full.facilities,
          }
        : {
            id:             slim.clubId,
            name:           slim.clubId,
            reputation:     0,
            tier:           seasonLeague.tier,
            primaryColor:   '#888888',
            secondaryColor: '#444444',
            stadiumName:    null,
            facilities:     {},
          };
    });

  return {
    id:                            seasonLeague.id,
    tier:                          seasonLeague.tier,
    name:                          seasonLeague.name,
    country:                       seasonLeague.country,
    season,
    promotionSpots:                seasonLeague.promotionSpots,
    reputationTier:                repTier,
    reputationCap:                 repTier ? (LEAGUE_TIER_REP_CAP[repTier] ?? null) : null,
    tvDeal:                        seasonLeague.tvDeal,
    sponsorPot:                    seasonLeague.sponsorPot,
    prizeMoney:                    seasonLeague.prizeMoney,
    leaguePositionPot:             seasonLeague.leaguePositionPot,
    leaguePositionDecreasePercent: seasonLeague.leaguePositionDecreasePercent,
    clubs,
  };
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests passing

- [ ] **Step 5: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: add buildPyramidPayload and buildLeagueSnapshot to SeasonTransitionService"
```

---

## Task 3: `applySeasonResponse`

**Files:**
- Modify: `src/engine/SeasonTransitionService.ts`
- Modify: `src/__tests__/engine/SeasonTransitionService.test.ts`

- [ ] **Step 1: Write failing tests**

Append to the test file:

```typescript
import { applySeasonResponse } from '@/engine/SeasonTransitionService';

const mockApplySeasonUpdate = jest.fn().mockResolvedValue(undefined);
const mockSetFromSync = jest.fn();
const mockAddMessage = jest.fn();
const mockClearSeason = jest.fn();
const mockLoadFromServerSchedule = jest.fn();

jest.mock('@/stores/leagueStore', () => ({
  useLeagueStore: { getState: () => ({ setFromSync: mockSetFromSync }) },
}));
jest.mock('@/stores/inboxStore', () => ({
  useInboxStore: { getState: () => ({ addMessage: mockAddMessage }) },
}));
// Add to the existing worldStore mock — update it to include applySeasonUpdate:
// (worldStore mock already set up above — update it)
jest.mock('@/stores/fixtureStore', () => ({
  useFixtureStore: {
    getState: () => ({
      fixtures: mockFixtures,
      clearSeason: mockClearSeason,
      loadFromServerSchedule: mockLoadFromServerSchedule,
    }),
  },
}));

const twoLeagueResponse: SeasonUpdateLeague[] = [
  {
    id: 'L7', tier: 7, name: 'League 7', country: 'BR', promotionSpots: 1,
    reputationTier: 'local', tvDeal: 1000000, sponsorPot: 0, prizeMoney: 0,
    leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
    clubs: [
      { clubId: 'c10', isAmp: false, promoted: false, relegated: true },
      { clubId: 'c11', isAmp: false, promoted: true, relegated: false },
    ],
    fixtures: [[['c10', 'c11']]],
  },
  {
    id: 'L8', tier: 8, name: 'League 8', country: 'BR', promotionSpots: 1,
    reputationTier: 'local', tvDeal: 500000, sponsorPot: 0, prizeMoney: 0,
    leaguePositionPot: 0, leaguePositionDecreasePercent: 8,
    clubs: [
      { clubId: 'amp1', isAmp: true, promoted: false, relegated: false },
      { clubId: 'c12', isAmp: false, promoted: false, relegated: true },
    ],
    fixtures: [[['amp1', 'c12']]],
  },
];

const mockCurrentLeague: LeagueSnapshot = {
  id: 'L8', tier: 8, name: 'League 8', country: 'BR', season: 1,
  promotionSpots: 1, reputationTier: 'local', reputationCap: 14,
  tvDeal: 500000, sponsorPot: 0, prizeMoney: 0, leaguePositionPot: 0,
  leaguePositionDecreasePercent: 8, clubs: [],
};

describe('applySeasonResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore worldStore mock to include applySeasonUpdate
    const { useWorldStore } = jest.requireMock('@/stores/worldStore');
    useWorldStore.getState = () => ({
      clubs: { 'c1': { id: 'c1', name: 'Club One', reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#000', stadiumName: null, facilities: {} } },
      leagues: [],
      applySeasonUpdate: mockApplySeasonUpdate,
    });
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 10 } });
  });

  it('calls worldStore.applySeasonUpdate with the response leagues', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockApplySeasonUpdate).toHaveBeenCalledWith(twoLeagueResponse);
  });

  it('calls leagueStore.setFromSync with a LeagueSnapshot for the AMP league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockSetFromSync).toHaveBeenCalledOnce();
    const snapshot = mockSetFromSync.mock.calls[0][0];
    expect(snapshot.id).toBe('L8');
    expect(snapshot.season).toBe(2);
  });

  it('does NOT add an inbox message when AMP stays in the same league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockAddMessage).not.toHaveBeenCalled();
  });

  it('adds a PROMOTED inbox message when AMP moves to a lower-tier-number league', async () => {
    const promotedResponse = twoLeagueResponse.map((l) =>
      l.id === 'L8'
        ? { ...l, clubs: l.clubs.map((c) => c.isAmp ? { ...c, promoted: true } : c) }
        : l,
    );
    // Simulate AMP moved to L7 (tier 7 < tier 8 = promotion)
    const promotedLeagueResponse: SeasonUpdateLeague[] = [
      {
        ...twoLeagueResponse[0],
        id: 'L7', tier: 7,
        clubs: [
          { clubId: 'amp1', isAmp: true, promoted: true, relegated: false },
          { clubId: 'c11', isAmp: false, promoted: false, relegated: false },
        ],
      },
      { ...twoLeagueResponse[1], clubs: [{ clubId: 'c12', isAmp: false, promoted: false, relegated: true }] },
    ];
    await applySeasonResponse(promotedLeagueResponse, mockCurrentLeague, 2);
    expect(mockAddMessage).toHaveBeenCalledOnce();
    expect(mockAddMessage.mock.calls[0][0].body).toContain('promoted');
  });

  it('clears fixtures then loads server schedule for every response league', async () => {
    await applySeasonResponse(twoLeagueResponse, mockCurrentLeague, 2);
    expect(mockClearSeason).toHaveBeenCalledOnce();
    expect(mockLoadFromServerSchedule).toHaveBeenCalledTimes(2);
    expect(mockLoadFromServerSchedule).toHaveBeenCalledWith('L7', 2, twoLeagueResponse[0].fixtures);
    expect(mockLoadFromServerSchedule).toHaveBeenCalledWith('L8', 2, twoLeagueResponse[1].fixtures);
  });
});
```

- [ ] **Step 2: Run test to verify new tests fail**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage -t "applySeasonResponse" 2>&1 | tail -20
```

Expected: failures — `applySeasonResponse` not yet exported

- [ ] **Step 3: Implement `applySeasonResponse`**

Append to `src/engine/SeasonTransitionService.ts`:

```typescript
// ─── Store-mutating steps ─────────────────────────────────────────────────────

/**
 * Apply a conclude-season API response to all stores.
 * Order: worldStore → leagueStore → inbox (if league changed) → fixtureStore.
 * Club-to-league assignment is taken verbatim from the backend response.
 */
export async function applySeasonResponse(
  responseLeagues: SeasonUpdateLeague[],
  currentLeague: LeagueSnapshot,
  nextSeason: number,
): Promise<void> {
  // 1. Update all NPC league memberships, club tiers, and per-league AsyncStorage buckets.
  await useWorldStore.getState().applySeasonUpdate(responseLeagues);

  // 2. Find AMP's new league using isAmp flag — authoritative signal per spec.
  const ampLeague = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));

  if (ampLeague) {
    useLeagueStore.getState().setFromSync(buildLeagueSnapshot(ampLeague, nextSeason));

    // 3. Inbox notification if the AMP has moved to a different league.
    if (ampLeague.id !== currentLeague.id) {
      const direction = ampLeague.tier < currentLeague.tier ? 'PROMOTED' : 'RELEGATED';
      useInboxStore.getState().addMessage({
        id:      uuidv7(),
        type:    'system',
        week:    useClubStore.getState().club.weekNumber ?? 1,
        subject: `${direction} — Season ${nextSeason - 1} Complete`,
        body:    `You have been ${direction.toLowerCase()} to ${ampLeague.name}.`,
        isRead:  false,
      });
    }
  }

  // 4. Replace all fixtures with server-generated schedule for the new season.
  useFixtureStore.getState().clearSeason();
  for (const l of responseLeagues) {
    useFixtureStore.getState().loadFromServerSchedule(l.id, nextSeason, l.fixtures);
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests passing

- [ ] **Step 5: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: add applySeasonResponse to SeasonTransitionService"
```

---

## Task 4: `distributeSeasonFinances` + `recordSeasonHistory` + `performSeasonTransition`

**Files:**
- Modify: `src/engine/SeasonTransitionService.ts`
- Modify: `src/__tests__/engine/SeasonTransitionService.test.ts`

- [ ] **Step 1: Write failing tests**

Append to the test file:

```typescript
import {
  distributeSeasonFinances,
  recordSeasonHistory,
  performSeasonTransition,
} from '@/engine/SeasonTransitionService';
import type { SeasonTransitionSnapshot, SeasonStanding } from '@/engine/SeasonTransitionService';

const mockAddTransaction = jest.fn();
const mockAddSeasonRecord = jest.fn();
const mockConcludeSeason = jest.fn();

jest.mock('@/stores/financeStore', () => ({
  useFinanceStore: { getState: () => ({ addTransaction: mockAddTransaction }) },
}));
jest.mock('@/stores/leagueHistoryStore', () => ({
  useLeagueHistoryStore: { getState: () => ({ addSeasonRecord: mockAddSeasonRecord }) },
}));
jest.mock('@/api/endpoints/season', () => ({
  concludeSeason: mockConcludeSeason,
}));

const league8: LeagueSnapshot = {
  id: 'L8', tier: 8, name: 'League 8', country: 'BR', season: 1,
  promotionSpots: 1, reputationTier: 'local', reputationCap: 14,
  tvDeal: 500000, sponsorPot: 18329782, prizeMoney: 500000,
  leaguePositionPot: 500000, leaguePositionDecreasePercent: 8, clubs: [],
};

const mockStandings: SeasonStanding[] = [
  { id: 'amp1', name: 'My Club', primaryColor: '#0f0', pts: 20, gd: 10, gf: 15, ga: 5, played: 10, wins: 6, draws: 2, losses: 2 },
  { id: 'c12', name: 'Rival', primaryColor: '#f00', pts: 15, gd: 3, gf: 10, ga: 7, played: 10, wins: 4, draws: 3, losses: 3 },
  { id: 'c13', name: 'Last FC', primaryColor: '#00f', pts: 5, gd: -13, gf: 4, ga: 17, played: 10, wins: 1, draws: 2, losses: 7 },
];

const baseSnapshot: SeasonTransitionSnapshot = {
  currentLeague:    league8,
  currentSeason:    1,
  finalPosition:    1,
  promoted:         true,
  relegated:        false,
  weekNumber:       38,
  gamesPlayed:      10,
  wins:             6,
  draws:            2,
  losses:           2,
  goalsFor:         15,
  goalsAgainst:     5,
  points:           20,
  displayStandings: mockStandings,
};

// --- distributeSeasonFinances ---

describe('distributeSeasonFinances', () => {
  beforeEach(() => jest.clearAllMocks());

  it('credits TV deal for next season', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const tvCall = mockAddTransaction.mock.calls.find((c) => c[0].category === 'tv_deal');
    expect(tvCall).toBeDefined();
    expect(tvCall![0].description).toContain('Season 2');
    expect(tvCall![0].amount).toBe(5); // 500000 pence = £5
  });

  it('credits sponsor pot for next season', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const sponsorCall = mockAddTransaction.mock.calls.find((c) => c[0].category === 'league_sponsor');
    expect(sponsorCall).toBeDefined();
  });

  it('credits prize money with correct season label', () => {
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const prizeCall = mockAddTransaction.mock.calls.find((c) => c[0].description?.includes('prize money'));
    expect(prizeCall![0].description).toContain('Season 1');
  });

  it('calculates position prize correctly for Pos 1 (no decrease)', () => {
    // pos 1: multiplier = 1 - 0% decrease = 1.0 → pot = 500000 pence = £5
    distributeSeasonFinances(undefined, league8, 2, 1, 38);
    const posCall = mockAddTransaction.mock.calls.find((c) => c[0].description?.includes('position prize'));
    expect(posCall![0].amount).toBe(5);
  });

  it('reduces position prize for lower positions', () => {
    // pos 2: multiplier = 1 - 0.08 × 1 = 0.92 → 500000 × 0.92 = 460000 pence = £4600
    distributeSeasonFinances(undefined, league8, 2, 2, 38);
    const posCall = mockAddTransaction.mock.calls.find((c) => c[0].description?.includes('position prize'));
    expect(posCall![0].amount).toBe(4600);
  });

  it('uses ampSeasonLeague financials when provided', () => {
    const newLeague: SeasonUpdateLeague = {
      ...twoLeagueResponse[0],
      tvDeal: 9999999,
    };
    distributeSeasonFinances(newLeague, league8, 2, 1, 38);
    const tvCall = mockAddTransaction.mock.calls.find((c) => c[0].category === 'tv_deal');
    // 9999999 pence ÷ 100 = £99999.99 → penceToPounds rounds to 99999.99
    expect(tvCall![0].amount).toBe(99999.99);
  });
});

// --- recordSeasonHistory ---

describe('recordSeasonHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls addSeasonRecord with correct tier and season', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    expect(mockAddSeasonRecord).toHaveBeenCalledOnce();
    const record = mockAddSeasonRecord.mock.calls[0][0];
    expect(record.tier).toBe(8);
    expect(record.season).toBe(1);
    expect(record.leagueName).toBe('League 8');
    expect(record.weekCompleted).toBe(38);
  });

  it('records all clubs in standings with correct positions', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = mockAddSeasonRecord.mock.calls[0][0];
    expect(record.standings).toHaveLength(3);
    expect(record.standings[0].position).toBe(1);
    expect(record.standings[2].position).toBe(3);
  });

  it('marks AMP club entry with isAmp=true', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = mockAddSeasonRecord.mock.calls[0][0];
    expect(record.standings.find((s: { clubId: string }) => s.clubId === 'amp1')?.isAmp).toBe(true);
    expect(record.standings.find((s: { clubId: string }) => s.clubId === 'c12')?.isAmp).toBe(false);
  });

  it('sets relegated=true only for last-place club', () => {
    recordSeasonHistory(baseSnapshot, mockStandings, 'amp1');
    const record = mockAddSeasonRecord.mock.calls[0][0];
    expect(record.standings[2].relegated).toBe(true);
    expect(record.standings[0].relegated).toBe(false);
  });
});

// --- performSeasonTransition ---

describe('performSeasonTransition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConcludeSeason.mockResolvedValue({ seasonRecordId: 'rec1', newLeague: null, leagues: twoLeagueResponse });
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 38 } });
    const { useWorldStore } = jest.requireMock('@/stores/worldStore');
    useWorldStore.getState = () => ({
      clubs: {},
      leagues: mockWorldLeagues,
      applySeasonUpdate: mockApplySeasonUpdate,
    });
  });

  it('calls concludeSeason with the correct payload shape', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(mockConcludeSeason).toHaveBeenCalledOnce();
    const payload = mockConcludeSeason.mock.calls[0][0];
    expect(payload.finalPosition).toBe(1);
    expect(payload.promoted).toBe(true);
    expect(payload.pyramidSnapshot.leagues).toBeDefined();
  });

  it('calls applySeasonUpdate when response has leagues', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(mockApplySeasonUpdate).toHaveBeenCalledWith(twoLeagueResponse);
  });

  it('calls addSeasonRecord (history) after successful API call', async () => {
    await performSeasonTransition(baseSnapshot);
    expect(mockAddSeasonRecord).toHaveBeenCalledOnce();
  });

  it('propagates API errors to the caller', async () => {
    mockConcludeSeason.mockRejectedValue(new Error('Network error'));
    await expect(performSeasonTransition(baseSnapshot)).rejects.toThrow('Network error');
  });
});
```

- [ ] **Step 2: Run test to verify new tests fail**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage -t "distributeSeasonFinances|recordSeasonHistory|performSeasonTransition" 2>&1 | tail -20
```

Expected: failures — functions not yet defined

- [ ] **Step 3: Implement the three functions**

Append to `src/engine/SeasonTransitionService.ts`:

```typescript
/**
 * Credit leagueStore-derived financial distributions to financeStore.
 * Uses ampSeasonLeague financials when available; falls back to currentLeague.
 * All API values are in pence — converted to pounds via penceToPounds.
 */
export function distributeSeasonFinances(
  ampSeasonLeague: SeasonUpdateLeague | undefined,
  currentLeague: LeagueSnapshot,
  nextSeason: number,
  finalPosition: number,
  weekNumber: number,
): void {
  const { addTransaction }        = useFinanceStore.getState();
  const currentSeason             = nextSeason - 1;
  const tvDeal                    = ampSeasonLeague?.tvDeal                        ?? currentLeague.tvDeal                        ?? 0;
  const sponsorPot                = ampSeasonLeague?.sponsorPot                    ?? currentLeague.sponsorPot                    ?? 0;
  const prizeMoney                = ampSeasonLeague?.prizeMoney                    ?? currentLeague.prizeMoney                    ?? 0;
  const leaguePositionPot         = ampSeasonLeague?.leaguePositionPot             ?? currentLeague.leaguePositionPot             ?? 0;
  const leaguePositionDecPct      = ampSeasonLeague?.leaguePositionDecreasePercent ?? currentLeague.leaguePositionDecreasePercent ?? 0;

  if (tvDeal > 0) {
    addTransaction({ amount: penceToPounds(tvDeal), category: 'tv_deal',       description: `Season ${nextSeason} TV deal`,           weekNumber });
  }
  if (sponsorPot > 0) {
    addTransaction({ amount: penceToPounds(sponsorPot), category: 'league_sponsor', description: `Season ${nextSeason} league sponsor`, weekNumber });
  }
  if (prizeMoney > 0) {
    addTransaction({ amount: penceToPounds(prizeMoney), category: 'earnings',   description: `Season ${currentSeason} prize money (Pos ${finalPosition})`, weekNumber });
  }
  const posMultiplier = Math.max(0, 1 - (leaguePositionDecPct / 100) * (finalPosition - 1));
  const posPrize      = Math.round(leaguePositionPot * posMultiplier);
  if (posPrize > 0) {
    addTransaction({ amount: penceToPounds(posPrize), category: 'earnings', description: `Season ${currentSeason} position prize (Pos ${finalPosition})`, weekNumber });
  }
}

/**
 * Write the completed season's final standings to leagueHistoryStore.
 * Uses the displayStandings captured before store mutations — the authoritative
 * record of how the season actually ended.
 */
export function recordSeasonHistory(
  snapshot: SeasonTransitionSnapshot,
  displayStandings: SeasonStanding[],
  ampClubId: string,
): void {
  const { currentLeague, currentSeason, weekNumber } = snapshot;
  const totalClubs = displayStandings.length;
  useLeagueHistoryStore.getState().addSeasonRecord({
    tier:          currentLeague.tier,
    leagueName:    currentLeague.name,
    season:        currentSeason,
    weekCompleted: weekNumber,
    standings:     displayStandings.map((s, i) => {
      const pos = i + 1;
      return {
        clubId:         s.id,
        clubName:       s.name,
        isAmp:          s.id === ampClubId,
        position:       pos,
        played:         s.played,
        wins:           s.wins,
        draws:          s.draws,
        losses:         s.losses,
        goalsFor:       s.gf,
        goalsAgainst:   s.ga,
        goalDifference: s.gd,
        points:         s.pts,
        promoted:       currentLeague.promotionSpots != null && pos <= currentLeague.promotionSpots,
        relegated:      pos === totalClubs,
      };
    }),
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * The single entry point called by SeasonEndOverlay.
 * Builds the pyramid payload, calls the conclude-season API, then applies
 * the response to all stores in the correct order.
 * Throws on API failure — there is no offline fallback.
 */
export async function performSeasonTransition(snapshot: SeasonTransitionSnapshot): Promise<void> {
  const { currentLeague, currentSeason } = snapshot;
  const nextSeason  = currentSeason + 1;
  const ampClubId   = useClubStore.getState().club.id;
  const worldLeagues = useWorldStore.getState().leagues;

  const pyramidLeagues = buildPyramidPayload(currentLeague.id, worldLeagues, currentSeason);

  const response = await concludeSeason({
    finalPosition: snapshot.finalPosition,
    gamesPlayed:   snapshot.gamesPlayed,
    wins:          snapshot.wins,
    draws:         snapshot.draws,
    losses:        snapshot.losses,
    goalsFor:      snapshot.goalsFor,
    goalsAgainst:  snapshot.goalsAgainst,
    points:        snapshot.points,
    promoted:      snapshot.promoted,
    relegated:     snapshot.relegated,
    pyramidSnapshot: { leagues: pyramidLeagues },
  });

  const responseLeagues: SeasonUpdateLeague[] = response.leagues ?? [];

  if (responseLeagues.length > 0) {
    await applySeasonResponse(responseLeagues, currentLeague, nextSeason);
    const ampSeasonLeague = responseLeagues.find((l) => l.clubs.some((c) => c.isAmp));
    distributeSeasonFinances(ampSeasonLeague, currentLeague, nextSeason, snapshot.finalPosition, snapshot.weekNumber);
  }

  recordSeasonHistory(snapshot, snapshot.displayStandings, ampClubId);
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx jest src/__tests__/engine/SeasonTransitionService.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests passing

- [ ] **Step 5: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: complete SeasonTransitionService with full orchestrator and all exported functions"
```

---

## Task 5: Slim `SeasonEndOverlay.tsx`

**Files:**
- Modify: `src/components/SeasonEndOverlay.tsx`

- [ ] **Step 1: Replace the entire file content**

The component imports from the service, removes all business logic, and uses `SeasonStanding` in place of the local `Standing` type. Replace `src/components/SeasonEndOverlay.tsx` with:

```typescript
import { useMemo, useState, useEffect, useRef } from 'react';
import { View, Modal, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import {
  performSeasonTransition,
  type SeasonTransitionSnapshot,
  type SeasonStanding,
} from '@/engine/SeasonTransitionService';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function SeasonEndOverlay({ visible, onComplete }: Props) {
  const [isLoading, setIsLoading]                   = useState(false);
  const [hasError, setHasError]                     = useState(false);
  const processedRef                                = useRef(false);

  const [displayStandings,      setDisplayStandings]      = useState<SeasonStanding[]>([]);
  const [displayPromotionSpots, setDisplayPromotionSpots] = useState<number | null>(null);
  const [displayLeagueName,     setDisplayLeagueName]     = useState('');

  useEffect(() => {
    if (visible && !processedRef.current) {
      processedRef.current = true;
      void performTransition();
    }
    if (!visible) {
      processedRef.current = false;
      setDisplayStandings([]);
      setDisplayPromotionSpots(null);
      setDisplayLeagueName('');
      setHasError(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const league   = useLeagueStore((s) => s.league);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const club     = useClubStore((s) => s.club);
  const ampClubId = club.id;

  const standings = useMemo<SeasonStanding[]>(() => {
    if (!league) return [];
    const npcClubs = league.clubs;
    const allIds   = [ampClubId, ...npcClubs.map((c) => c.id)];

    const map: Record<string, SeasonStanding> = {};
    for (const id of allIds) {
      const isAmp = id === ampClubId;
      const snap  = npcClubs.find((c) => c.id === id);
      map[id] = {
        id,
        name:         isAmp ? club.name         : (snap?.name         ?? id),
        primaryColor: isAmp ? (club.primaryColor ?? WK.tealLight) : (snap?.primaryColor ?? '#888888'),
        pts: 0, gd: 0, gf: 0, ga: 0, played: 0, wins: 0, draws: 0, losses: 0,
      };
    }

    for (const f of fixtures.filter((fx) => fx.leagueId === league.id && fx.result)) {
      const { homeGoals, awayGoals } = f.result!;
      const home = map[f.homeClubId];
      const away = map[f.awayClubId];
      if (!home || !away) continue;
      home.played++; away.played++;
      home.gf += homeGoals; home.ga += awayGoals; home.gd += homeGoals - awayGoals;
      away.gf += awayGoals; away.ga += homeGoals; away.gd += awayGoals - homeGoals;
      if (homeGoals > awayGoals)      { home.pts += 3; home.wins++;  away.losses++; }
      else if (homeGoals < awayGoals) { away.pts += 3; away.wins++;  home.losses++; }
      else                            { home.pts += 1; away.pts += 1; home.draws++; away.draws++; }
    }

    return Object.values(map).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [league, fixtures, ampClubId, club.name, club.primaryColor]);

  const dispAmpIndex  = displayStandings.findIndex((s) => s.id === ampClubId);
  const dispAmpPos    = dispAmpIndex + 1;
  const dispAmpEntry  = displayStandings[dispAmpIndex] ?? null;
  const dispPromoted  = displayPromotionSpots != null && dispAmpPos > 0 && dispAmpPos <= displayPromotionSpots;
  const dispRelegated = displayStandings.length > 0 && dispAmpPos === displayStandings.length;
  const posColor      = dispPromoted ? WK.green : dispRelegated ? WK.red : WK.yellow;
  const posLabel      = dispPromoted ? 'PROMOTED!' : dispRelegated ? 'RELEGATED' : `#${dispAmpPos}`;

  async function performTransition() {
    if (isLoading) return;
    setIsLoading(true);
    setHasError(false);

    const capturedStandings = standings;
    const currentLeague     = useLeagueStore.getState().league;
    const currentSeason     = currentLeague?.season ?? 1;
    const capturedAmpIndex  = capturedStandings.findIndex((s) => s.id === ampClubId);
    const capturedAmpPos    = capturedAmpIndex + 1;
    const capturedAmpEntry  = capturedStandings[capturedAmpIndex] ?? null;

    setDisplayStandings(capturedStandings);
    setDisplayPromotionSpots(currentLeague?.promotionSpots ?? null);
    setDisplayLeagueName(currentLeague?.name ?? '');

    if (!currentLeague || !capturedAmpEntry) {
      setIsLoading(false);
      return;
    }

    const snapshot: SeasonTransitionSnapshot = {
      currentLeague,
      currentSeason,
      finalPosition:    capturedAmpPos,
      promoted:         currentLeague.promotionSpots != null
                          && capturedAmpPos > 0
                          && capturedAmpPos <= currentLeague.promotionSpots,
      relegated:        capturedStandings.length > 0 && capturedAmpPos === capturedStandings.length,
      weekNumber:       useClubStore.getState().club.weekNumber ?? 1,
      gamesPlayed:      capturedAmpEntry.played,
      wins:             capturedAmpEntry.wins,
      draws:            capturedAmpEntry.draws,
      losses:           capturedAmpEntry.losses,
      goalsFor:         capturedAmpEntry.gf,
      goalsAgainst:     capturedAmpEntry.ga,
      points:           capturedAmpEntry.pts,
      displayStandings: capturedStandings,
    };

    try {
      await performSeasonTransition(snapshot);
    } catch (err) {
      console.warn('[SeasonEndOverlay] conclude-season failed:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 }}>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 4,
          borderColor: WK.yellow,
          maxHeight: '90%',
          ...pixelShadow,
        }}>

          {/* ── Header ── */}
          <View style={{ padding: 16, borderBottomWidth: 3, borderBottomColor: WK.border, alignItems: 'center', gap: 8 }}>
            <Trophy size={28} color={WK.yellow} />
            <PixelText size={14} color={WK.yellow} upper>Season Over</PixelText>
            {displayLeagueName ? (
              <BodyText size={12} dim numberOfLines={1}>{displayLeagueName.toUpperCase()}</BodyText>
            ) : null}
          </View>

          {/* ── AMP summary ── */}
          {dispAmpEntry && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-around',
              paddingVertical: 12, paddingHorizontal: 16,
              borderBottomWidth: 3, borderBottomColor: WK.border,
              backgroundColor: WK.yellow + '12',
            }}>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={18} color={posColor}>{posLabel}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>POSITION</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={18} color={WK.tealLight}>{dispAmpEntry.pts}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>POINTS</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={14} color={WK.text}>
                  {dispAmpEntry.wins}W {dispAmpEntry.draws}D {dispAmpEntry.losses}L
                </PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>RECORD</BodyText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <PixelText size={14} color={WK.text}>{dispAmpEntry.gf}-{dispAmpEntry.ga}</PixelText>
                <BodyText size={10} dim style={{ marginTop: 2 }}>GOALS</BodyText>
              </View>
            </View>
          )}

          {/* ── League Table ── */}
          <View style={{ paddingHorizontal: 12, paddingTop: 8, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 }}>
              <BodyText size={10} dim style={{ width: 28 }}>#</BodyText>
              <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
              <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>PL</BodyText>
              <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>GD</BodyText>
              <BodyText size={10} dim style={{ width: 36, textAlign: 'right' }}>PTS</BodyText>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {displayStandings.map((entry, i) => {
              const isAmp = entry.id === ampClubId;
              return (
                <View key={entry.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 6, paddingHorizontal: 4,
                  borderBottomWidth: i < displayStandings.length - 1 ? 1 : 0,
                  borderBottomColor: WK.border,
                  backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
                }}>
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>{i + 1}</BodyText>
                  <View style={{ width: 10, height: 10, backgroundColor: entry.primaryColor, borderWidth: 1, borderColor: WK.border, marginRight: 6 }} />
                  <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
                    {entry.name.toUpperCase()}
                  </BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>{entry.played}</BodyText>
                  <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                    {entry.gd > 0 ? `+${entry.gd}` : entry.gd}
                  </BodyText>
                  <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 36, textAlign: 'right' }}>{entry.pts}</BodyText>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={{ padding: 16, borderTopWidth: 3, borderTopColor: WK.border }}>
            {isLoading ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <PixelText size={8} color={WK.yellow}>PREPARING NEXT SEASON...</PixelText>
              </View>
            ) : hasError ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <PixelText size={7} color={WK.red} style={{ textAlign: 'center' }}>
                  SEASON TRANSITION FAILED
                </PixelText>
                <BodyText size={12} dim style={{ textAlign: 'center' }}>
                  Check your connection and try again.
                </BodyText>
              </View>
            ) : (
              <Button label="CONTINUE TO NEXT SEASON" variant="yellow" fullWidth onPress={onComplete} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to these files)

- [ ] **Step 3: Run all tests to confirm nothing regressed**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests still passing

- [ ] **Step 4: Commit**

```bash
git add src/components/SeasonEndOverlay.tsx
git commit -m "refactor: slim SeasonEndOverlay to UI shell, delegate logic to SeasonTransitionService"
```

---

## Task 6: `SeasonHistory.tsx` component

**Files:**
- Create: `src/components/competitions/SeasonHistory.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/competitions/SeasonHistory.tsx`:

```typescript
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueHistoryStore } from '@/stores/leagueHistoryStore';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import type { LeagueSeasonRecord, LeagueStandingEntry } from '@/types/leagueHistory';

export function SeasonHistory() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ampClubId = useClubStore((s) => s.club.id);
  const history   = useLeagueHistoryStore((s) => s.history);

  // Flatten all tier records and sort newest season first
  const allRecords: LeagueSeasonRecord[] = Object.values(history)
    .flat()
    .sort((a, b) => b.season - a.season || b.tier - a.tier);

  if (allRecords.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
        <PixelText size={9} color={WK.dim}>NO HISTORY YET</PixelText>
        <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
          Complete a season to see your history here.
        </BodyText>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
      {allRecords.map((record) => {
        const recordId    = `${record.tier}-${record.season}`;
        const isExpanded  = expandedId === recordId;
        const ampEntry    = record.standings.find((s) => s.isAmp);
        const ampPos      = ampEntry?.position ?? 0;
        const totalClubs  = record.standings.length;
        const isPromoted  = ampEntry?.promoted ?? false;
        const isRelegated = ampEntry?.relegated ?? false;
        const posColor    = isPromoted ? WK.green : isRelegated ? WK.red : WK.yellow;
        const posLabel    = isPromoted ? `#${ampPos} PROMOTED` : isRelegated ? `#${ampPos} REL` : `#${ampPos}`;

        return (
          <View key={recordId} style={{ marginBottom: 4 }}>
            {/* ── Collapsed header row ── */}
            <Pressable
              onPress={() => setExpandedId((prev) => (prev === recordId ? null : recordId))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: WK.tealCard,
                borderWidth: 2,
                borderColor: WK.border,
                gap: 10,
              }}
            >
              {/* Tier badge */}
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 2,
                borderColor: WK.border,
                paddingHorizontal: 6,
                paddingVertical: 3,
                minWidth: 36,
                alignItems: 'center',
              }}>
                <VT323Text size={16} color={WK.yellow}>T{record.tier}</VT323Text>
              </View>

              {/* League + season info */}
              <View style={{ flex: 1 }}>
                <PixelText size={8} color={WK.text} numberOfLines={1}>{record.leagueName}</PixelText>
                <BodyText size={12} dim style={{ marginTop: 2 }}>Season {record.season}</BodyText>
              </View>

              {/* AMP position badge */}
              {ampEntry && (
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <PixelText size={8} color={posColor}>{posLabel}</PixelText>
                  <BodyText size={11} dim>
                    {ampEntry.wins}W {ampEntry.draws}D {ampEntry.losses}L · {ampEntry.points}pts
                  </BodyText>
                </View>
              )}

              {isExpanded
                ? <ChevronDown size={16} color={WK.dim} />
                : <ChevronRight size={16} color={WK.dim} />
              }
            </Pressable>

            {/* ── Expanded standings table ── */}
            {isExpanded && (
              <View style={{
                borderWidth: 2,
                borderTopWidth: 0,
                borderColor: WK.border,
              }}>
                {/* Table header */}
                <View style={{
                  flexDirection: 'row',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: WK.border,
                  backgroundColor: WK.tealDark,
                }}>
                  <BodyText size={10} dim style={{ width: 28 }}>#</BodyText>
                  <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
                  <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>PL</BodyText>
                  <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>GD</BodyText>
                  <BodyText size={10} dim style={{ width: 36, textAlign: 'right' }}>PTS</BodyText>
                </View>

                {/* Table rows */}
                {record.standings
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((entry: LeagueStandingEntry, i: number, arr: LeagueStandingEntry[]) => {
                    const isAmp = entry.clubId === ampClubId;
                    return (
                      <View
                        key={entry.clubId}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: WK.border,
                          backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
                        }}
                      >
                        <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>
                          {entry.position}
                        </BodyText>
                        <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
                          {entry.clubName.toUpperCase()}
                        </BodyText>
                        <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>{entry.played}</BodyText>
                        <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                          {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                        </BodyText>
                        <BodyText size={12} color={isAmp ? WK.yellow : WK.text} style={{ width: 36, textAlign: 'right' }}>
                          {entry.points}
                        </BodyText>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from the new file

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/SeasonHistory.tsx
git commit -m "feat: add SeasonHistory component with expandable per-season standings"
```

---

## Task 7: Add HISTORY tab to competitions screen

**Files:**
- Modify: `app/(tabs)/competitions.tsx`

- [ ] **Step 1: Add the HISTORY tab**

In `app/(tabs)/competitions.tsx`, make three changes:

**Change 1** — add import at the top of the file (after existing competition imports):
```typescript
import { SeasonHistory } from '@/components/competitions/SeasonHistory';
```

**Change 2** — update `COMP_TABS`:
```typescript
// OLD:
const COMP_TABS = ['LEAGUE', 'FIXTURES', 'BROWSE', 'RANKINGS'] as const;

// NEW:
const COMP_TABS = ['LEAGUE', 'FIXTURES', 'BROWSE', 'RANKINGS', 'HISTORY'] as const;
```

**Change 3** — add the HISTORY pane render, after the `{activeTab === 'RANKINGS' && <RankingsPane />}` line:
```typescript
      {activeTab === 'HISTORY' && <SeasonHistory />}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

- [ ] **Step 3: Run all tests to confirm nothing regressed**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests still passing

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/competitions.tsx
git commit -m "feat: add HISTORY tab to Competition hub showing season records"
```

---

## Self-Review

**Spec coverage:**
- ✅ `SeasonTransitionService.ts` created — Tasks 1–4
- ✅ `SeasonTransitionSnapshot` and `SeasonStanding` types exported — Task 1
- ✅ `buildLeagueStandings` (unified, no AMP special path) — Task 1
- ✅ `buildPyramidPayload` + `buildLeagueSnapshot` — Task 2
- ✅ `applySeasonResponse` — Task 3
- ✅ `distributeSeasonFinances` + `recordSeasonHistory` + `performSeasonTransition` — Task 4
- ✅ Backend mapping rules (no dedup, relegated=status only, isAmp=authoritative) — Task 2 (`buildLeagueSnapshot`) + Task 3 (`applySeasonResponse`)
- ✅ `SeasonEndOverlay.tsx` slimmed to UI shell — Task 5
- ✅ Error state shown in overlay footer on API failure — Task 5
- ✅ `SeasonHistory.tsx` component — Task 6
- ✅ HISTORY tab wired to competitions hub — Task 7

**Type consistency check:**
- `SeasonStanding` defined in Task 1, used in Task 4 (`recordSeasonHistory`) and Task 5 (`SeasonEndOverlay`) ✅
- `SeasonTransitionSnapshot` defined in Task 1, includes `displayStandings: SeasonStanding[]`, used in Tasks 4 and 5 ✅
- `buildLeagueSnapshot` defined in Task 2 as `(seasonLeague, season)` — used same in Tasks 3 and 4 ✅
- `applySeasonResponse` defined in Task 3 as `(responseLeagues, currentLeague, nextSeason)` — called same in Task 4 ✅

**Placeholder scan:** No TBDs, no "implement later". All code blocks complete.
