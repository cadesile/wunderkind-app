# Fan Events for Trophies & Promotions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fire permanent, undecayed fan events when the AMP club wins the league, earns promotion, or is relegated — extending the existing FanEvent system so milestone events are never pruned and always contribute full impact to the fan happiness score.

**Architecture:** Four targeted changes: (1) add `isPermanent` flag and new event types to `FanEvent`; (2) update `fanStore` pruning and cap logic; (3) update `FanEngine.calculateScore` to skip decay for permanent events; (4) add `awardSeasonFanEvents` to `SeasonTransitionService` and call it at season end.

**Tech Stack:** TypeScript / Zustand (AsyncStorage persist) / Jest (jest-expo)

---

## File Map

| File | Change |
|---|---|
| `src/types/fans.ts` | Add `isPermanent?` to `FanEvent`; add `'trophy_won' \| 'promoted' \| 'relegated'` to `FanEventType` |
| `src/stores/fanStore.ts` | `pruneEvents` — 52-week threshold + skip permanent; `addEvent` — protect permanent from 50-event cap |
| `src/engine/FanEngine.ts` | `calculateScore` + `calculateTargetScore` — no decay for permanent events |
| `src/engine/SeasonTransitionService.ts` | Add `awardSeasonFanEvents`; call it at end of `performSeasonTransition` |
| `src/__tests__/engine/fanEvents.test.ts` | New test file covering all new behaviour |

---

## Task 1: Add `isPermanent` flag and new event types to `src/types/fans.ts`

**Files:**
- Modify: `src/types/fans.ts`
- Test: `src/__tests__/engine/fanEvents.test.ts` (created here, extended in later tasks)

### Context
`src/types/fans.ts` currently exports:
- `FanEventType` — a union of string literals
- `FanEvent` — interface with `id`, `type`, `description`, `impact`, `weekNumber`, `targets`
- `FanTier`, `FanImpactTarget` — unchanged

Read the file before editing to confirm current field list.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/engine/fanEvents.test.ts`:

```ts
import type { FanEvent } from '@/types/fans';

describe('FanEvent type', () => {
  it('accepts isPermanent: true', () => {
    const e: FanEvent = {
      id: 'test-1',
      type: 'trophy_won',
      description: 'League title',
      impact: 30,
      weekNumber: 38,
      targets: ['manager', 'owner', 'players'],
      isPermanent: true,
    };
    expect(e.isPermanent).toBe(true);
  });

  it('accepts isPermanent omitted (undefined)', () => {
    const e: FanEvent = {
      id: 'test-2',
      type: 'match_win',
      description: 'Win',
      impact: 5,
      weekNumber: 10,
      targets: ['players'],
    };
    expect(e.isPermanent).toBeUndefined();
  });

  it('accepts trophy_won, promoted, relegated event types', () => {
    const types: FanEvent['type'][] = ['trophy_won', 'promoted', 'relegated'];
    expect(types).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -15
```

Expected: FAIL — `'trophy_won'` not assignable to `FanEventType`.

- [ ] **Step 3: Update `src/types/fans.ts`**

Add `'trophy_won' | 'promoted' | 'relegated'` to `FanEventType`:

```ts
export type FanEventType =
  | 'match_win' | 'match_loss' | 'match_draw'
  | 'player_sold' | 'player_sold_favorite'
  | 'facility_upgrade' | 'system_bonus' | 'system_penalty'
  | 'trophy_won' | 'promoted' | 'relegated';
```

Add `isPermanent?: boolean` to `FanEvent` — append it as the last field:

```ts
export interface FanEvent {
  id: string;
  type: FanEventType;
  description: string;
  impact: number;
  weekNumber: number;
  targets: FanImpactTarget[];
  isPermanent?: boolean;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -15
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/types/fans.ts src/__tests__/engine/fanEvents.test.ts
git commit -m "feat: add isPermanent flag and trophy/promotion event types to FanEvent"
```

---

## Task 2: Update `fanStore` — pruning threshold and cap logic

**Files:**
- Modify: `src/stores/fanStore.ts`
- Modify: `src/__tests__/engine/fanEvents.test.ts`

### Context
`src/stores/fanStore.ts` currently has:
- `pruneEvents: (currentWeek) => set(...)` — removes events where `currentWeek - e.weekNumber >= 10`
- `addEvent: (event) => set(...)` — prepends event and slices to 50

Both need updating. Read the file before editing.

- [ ] **Step 1: Add pruneEvents and addEvent tests**

Append to `src/__tests__/engine/fanEvents.test.ts`:

```ts
import { useFanStore } from '@/stores/fanStore';

describe('fanStore.pruneEvents', () => {
  beforeEach(() => {
    useFanStore.setState({ events: [] });
  });

  it('keeps events within 52 weeks', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'match_win', description: 'w', impact: 5, weekNumber: 1, targets: [] },
      ],
    });
    useFanStore.getState().pruneEvents(52); // exactly 51 weeks ago — keep
    expect(useFanStore.getState().events).toHaveLength(1);
  });

  it('removes non-permanent events older than 52 weeks', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'match_win', description: 'w', impact: 5, weekNumber: 1, targets: [] },
      ],
    });
    useFanStore.getState().pruneEvents(54); // 53 weeks ago — remove
    expect(useFanStore.getState().events).toHaveLength(0);
  });

  it('never removes permanent events regardless of age', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'trophy_won', description: 't', impact: 30, weekNumber: 1, targets: [], isPermanent: true },
      ],
    });
    useFanStore.getState().pruneEvents(1000);
    expect(useFanStore.getState().events).toHaveLength(1);
  });
});

describe('fanStore.addEvent — cap protects permanent events', () => {
  beforeEach(() => {
    useFanStore.setState({ events: [] });
  });

  it('keeps all permanent events when non-permanent fills the cap', () => {
    // Pre-fill with 50 non-permanent events
    const nonPermanent = Array.from({ length: 50 }, (_, i) => ({
      id: `np-${i}`,
      type: 'match_win' as const,
      description: 'w',
      impact: 1,
      weekNumber: i + 1,
      targets: [] as [],
    }));
    useFanStore.setState({ events: nonPermanent });

    // Add a permanent event
    useFanStore.getState().addEvent({
      type: 'trophy_won',
      description: 'title',
      impact: 30,
      weekNumber: 100,
      targets: [],
      isPermanent: true,
    });

    const { events } = useFanStore.getState();
    expect(events.length).toBeLessThanOrEqual(50);
    const permanent = events.filter((e) => e.isPermanent);
    expect(permanent).toHaveLength(1);
    expect(permanent[0].type).toBe('trophy_won');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — pruneEvents still uses 10-week threshold; addEvent still uses simple slice.

- [ ] **Step 3: Update `src/stores/fanStore.ts`**

Replace `pruneEvents`:

```ts
pruneEvents: (currentWeek) =>
  set((state) => ({
    events: state.events.filter(
      (e) => e.isPermanent || (currentWeek - e.weekNumber) < 52,
    ),
  })),
```

Replace `addEvent`:

```ts
addEvent: (event) =>
  set((state) => {
    const newEvent = { ...event, id: uuidv7() };
    const all = [newEvent, ...state.events];
    const permanent    = all.filter((e) => e.isPermanent);
    const nonPermanent = all
      .filter((e) => !e.isPermanent)
      .slice(0, Math.max(0, 50 - permanent.length));
    return { events: [...permanent, ...nonPermanent] };
  }),
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests including Task 1's 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/fanStore.ts src/__tests__/engine/fanEvents.test.ts
git commit -m "feat: update fanStore pruneEvents to 52 weeks and protect permanent events from cap"
```

---

## Task 3: Update `FanEngine.calculateScore` and `calculateTargetScore`

**Files:**
- Modify: `src/engine/FanEngine.ts`
- Modify: `src/__tests__/engine/fanEvents.test.ts`

### Context
`src/engine/FanEngine.ts` has two methods that apply decay: `calculateScore` and `calculateTargetScore`. Both use the same formula `Math.max(0, 1 - (weeksAgo * 0.1))`. Both need updating to skip decay for permanent events.

Read `src/engine/FanEngine.ts` before editing.

- [ ] **Step 1: Add FanEngine tests**

Append to `src/__tests__/engine/fanEvents.test.ts`:

```ts
import { FanEngine } from '@/engine/FanEngine';

describe('FanEngine.calculateScore — permanent events', () => {
  beforeEach(() => {
    useFanStore.setState({ events: [] });
  });

  it('permanent events contribute full impact even after 10+ weeks', () => {
    useFanStore.setState({
      events: [
        {
          id: '1',
          type: 'trophy_won',
          description: 'title',
          impact: 30,
          weekNumber: 1,
          targets: [],
          isPermanent: true,
        },
      ],
    });
    // At week 100, a non-permanent event would have decayed to 0 (weeksAgo = 99)
    const score = FanEngine.calculateScore(100);
    // baseline 50 + full impact 30 = 80
    expect(score).toBe(80);
  });

  it('non-permanent events still decay normally', () => {
    useFanStore.setState({
      events: [
        {
          id: '1',
          type: 'match_win',
          description: 'win',
          impact: 10,
          weekNumber: 1,
          targets: [],
        },
      ],
    });
    // At week 12, weeksAgo = 11, decay = max(0, 1 - 1.1) = 0 → no contribution
    const score = FanEngine.calculateScore(12);
    expect(score).toBe(50); // baseline only
  });

  it('stacks multiple permanent events', () => {
    useFanStore.setState({
      events: [
        { id: '1', type: 'trophy_won',  description: 't1', impact: 30, weekNumber: 1,  targets: [], isPermanent: true },
        { id: '2', type: 'trophy_won',  description: 't2', impact: 30, weekNumber: 52, targets: [], isPermanent: true },
      ],
    });
    const score = FanEngine.calculateScore(200);
    // 50 + 30 + 30 = 110 → clamped to 100
    expect(score).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — permanent events still decay in `calculateScore`.

- [ ] **Step 3: Update `src/engine/FanEngine.ts`**

In `calculateScore`, replace the decay line:

```ts
// BEFORE:
const decay = Math.max(0, 1 - (weeksAgo * 0.1));

// AFTER:
const decay = event.isPermanent
  ? 1
  : Math.max(0, 1 - (weeksAgo * 0.1));
```

Apply the identical change in `calculateTargetScore` (same pattern, same file).

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents" --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/FanEngine.ts src/__tests__/engine/fanEvents.test.ts
git commit -m "feat: skip decay for permanent FanEvents in FanEngine.calculateScore"
```

---

## Task 4: Add `awardSeasonFanEvents` to `SeasonTransitionService`

**Files:**
- Modify: `src/engine/SeasonTransitionService.ts`
- Modify: `src/__tests__/engine/SeasonTransitionService.test.ts`

### Context
`src/engine/SeasonTransitionService.ts` already has `awardSeasonTrophies` — a standalone exported function called at the end of `performSeasonTransition`. The new `awardSeasonFanEvents` follows the same pattern.

`SeasonTransitionSnapshot` fields needed:
- `snapshot.finalPosition: number` — 1 = champion
- `snapshot.promoted: boolean`
- `snapshot.relegated: boolean`
- `snapshot.currentLeague.name: string` — league display name
- `snapshot.currentSeason: number`
- `snapshot.weekNumber: number`

`FanImpactTarget` from `@/types/fans` = `'manager' | 'owner' | 'players'`.

The existing test file at `src/__tests__/engine/SeasonTransitionService.test.ts` already has `mockAddTrophy` and `mockAddTrophyToClub`. You need to add a mock for `useFanStore` alongside the existing store mocks.

Read both files before editing.

- [ ] **Step 1: Add mock and tests to `SeasonTransitionService.test.ts`**

Find where `@/stores/clubStore` and `@/stores/worldStore` are mocked in the test file. Add a mock for `@/stores/fanStore` in the same block:

```ts
const mockAddFanEvent = jest.fn();

jest.mock('@/stores/fanStore', () => ({
  useFanStore: {
    getState: () => ({
      addEvent: mockAddFanEvent,
    }),
  },
}));
```

Add `mockAddFanEvent` to the `jest.clearAllMocks()` call in the existing `beforeEach` (or add `mockAddFanEvent.mockClear()` there).

Add `awardSeasonFanEvents` to the import from `SeasonTransitionService`:

```ts
import { ..., awardSeasonFanEvents } from '@/engine/SeasonTransitionService';
```

Add a new `describe('awardSeasonFanEvents')` block:

```ts
describe('awardSeasonFanEvents', () => {
  const baseSnapshot = {
    currentLeague: { name: 'Northern League', id: 'league-1', tier: 3, promotionSpots: 2, reputationTier: 'local' },
    currentSeason: 1,
    finalPosition: 5,
    promoted: false,
    relegated: false,
    weekNumber: 38,
    gamesPlayed: 38, wins: 15, draws: 10, losses: 13,
    goalsFor: 50, goalsAgainst: 45, points: 55,
    displayStandings: [],
    retirementMinAge: 32, retirementMaxAge: 38, retirementChance: 0.3,
  };

  beforeEach(() => {
    mockAddFanEvent.mockClear();
  });

  it('fires trophy_won event (impact 30, permanent) when finalPosition === 1', () => {
    awardSeasonFanEvents({ ...baseSnapshot, finalPosition: 1, promoted: true });
    expect(mockAddFanEvent).toHaveBeenCalledTimes(1);
    expect(mockAddFanEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'trophy_won',
        impact: 30,
        isPermanent: true,
        targets: ['manager', 'owner', 'players'],
      }),
    );
  });

  it('does NOT fire promoted event when finalPosition === 1 (title subsumes promotion)', () => {
    awardSeasonFanEvents({ ...baseSnapshot, finalPosition: 1, promoted: true });
    const calls = mockAddFanEvent.mock.calls.map((c) => c[0].type);
    expect(calls).not.toContain('promoted');
  });

  it('fires promoted event (impact 20, permanent) when promoted and not champion', () => {
    awardSeasonFanEvents({ ...baseSnapshot, finalPosition: 2, promoted: true });
    expect(mockAddFanEvent).toHaveBeenCalledTimes(1);
    expect(mockAddFanEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'promoted',
        impact: 20,
        isPermanent: true,
        targets: ['manager', 'owner', 'players'],
      }),
    );
  });

  it('fires relegated event (impact -20, permanent) when relegated', () => {
    awardSeasonFanEvents({ ...baseSnapshot, finalPosition: 14, relegated: true });
    expect(mockAddFanEvent).toHaveBeenCalledTimes(1);
    expect(mockAddFanEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'relegated',
        impact: -20,
        isPermanent: true,
        targets: ['manager', 'owner', 'players'],
      }),
    );
  });

  it('fires no events for a mid-table finish (not promoted, not relegated, not champion)', () => {
    awardSeasonFanEvents({ ...baseSnapshot, finalPosition: 7 });
    expect(mockAddFanEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="SeasonTransitionService" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `awardSeasonFanEvents` not exported.

- [ ] **Step 3: Add `awardSeasonFanEvents` to `src/engine/SeasonTransitionService.ts`**

Add the import for `useFanStore` and `FanImpactTarget` at the top of the file (alongside existing imports):

```ts
import { useFanStore } from '@/stores/fanStore';
import type { FanImpactTarget } from '@/types/fans';
```

Add the new function immediately after `awardSeasonTrophies` (before `performSeasonTransition`):

```ts
export function awardSeasonFanEvents(snapshot: SeasonTransitionSnapshot): void {
  const { addEvent } = useFanStore.getState();
  const ALL_TARGETS: FanImpactTarget[] = ['manager', 'owner', 'players'];

  if (snapshot.finalPosition === 1) {
    addEvent({
      type:        'trophy_won',
      description: `League title — ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      30,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
    return; // title win subsumes promotion
  }

  if (snapshot.promoted) {
    addEvent({
      type:        'promoted',
      description: `Promoted from ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      20,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
  }

  if (snapshot.relegated) {
    addEvent({
      type:        'relegated',
      description: `Relegated from ${snapshot.currentLeague.name} Season ${snapshot.currentSeason}`,
      impact:      -20,
      weekNumber:  snapshot.weekNumber,
      targets:     ALL_TARGETS,
      isPermanent: true,
    });
  }
}
```

Add the call at the end of `performSeasonTransition`, after `awardSeasonTrophies`:

```ts
awardSeasonTrophies(snapshot, pyramidLeagues, responseLeagues);
awardSeasonFanEvents(snapshot);  // ← new last line
```

- [ ] **Step 4: Run all SeasonTransitionService tests**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="SeasonTransitionService" --no-coverage 2>&1 | tail -25
```

Expected: PASS — all existing tests + 5 new `awardSeasonFanEvents` tests.

- [ ] **Step 5: Run the full fan events test suite**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx jest --testPathPattern="fanEvents|SeasonTransitionService" --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: add awardSeasonFanEvents to SeasonTransitionService"
```
