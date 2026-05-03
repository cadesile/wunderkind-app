# Fan Events for Trophies & Promotions — Design Spec

**Goal:** Fire permanent, undecayed fan events when the AMP club wins a league title, earns promotion, or is relegated. Extend the existing `FanEvent` system so these milestone events are never pruned and always contribute their full impact to the fan score.

**Architecture:** Minimal extension of the existing `fanStore` / `FanEngine` / `SeasonTransitionService` stack. A new `isPermanent` flag on `FanEvent` gates pruning and decay. A new `awardSeasonFanEvents` pure function in `SeasonTransitionService` fires the three event types at season end. No new stores, no new UI, no changes to `calculateWeeklyFinances`.

**Tech Stack:** TypeScript / Zustand (AsyncStorage persist) / Expo Router

---

## 1. Data Model — `src/types/fans.ts`

### Add to `FanEventType` union
```ts
export type FanEventType =
  | 'match_win' | 'match_loss' | 'match_draw'
  | 'player_sold' | 'player_sold_favorite'
  | 'facility_upgrade' | 'system_bonus' | 'system_penalty'
  | 'trophy_won' | 'promoted' | 'relegated';   // NEW
```

### Add to `FanEvent` interface
```ts
export interface FanEvent {
  id: string;
  type: FanEventType;
  description: string;
  impact: number;
  weekNumber: number;
  targets: FanImpactTarget[];
  isPermanent?: boolean;   // NEW — if true: never pruned, never decayed
}
```

---

## 2. Store — `src/stores/fanStore.ts`

### `pruneEvents` — raise threshold from 10 → 52 weeks, skip permanent events

```ts
pruneEvents: (currentWeek) => set((state) => ({
  events: state.events.filter(
    (e) => e.isPermanent || (currentWeek - e.weekNumber) < 52
  ),
})),
```

### `addEvent` — protect permanent events from the 50-event cap

Current: `[{ ...event, id: uuidv7() }, ...state.events].slice(0, 50)`

New logic: keep ALL permanent events + newest non-permanent events up to a combined total of 50.

```ts
addEvent: (event) =>
  set((state) => {
    const newEvent = { ...event, id: uuidv7() };
    const all = [newEvent, ...state.events];
    const permanent    = all.filter((e) => e.isPermanent);
    const nonPermanent = all.filter((e) => !e.isPermanent)
                            .slice(0, Math.max(0, 50 - permanent.length));
    return { events: [...permanent, ...nonPermanent] };
  }),
```

---

## 3. Engine — `src/engine/FanEngine.ts`

### `calculateScore` — permanent events are not decayed

```ts
static calculateScore(currentWeek: number): number {
  const events = useFanStore.getState().events;
  let score = 50;

  events.forEach((event) => {
    const weeksAgo = currentWeek - event.weekNumber;
    if (weeksAgo < 0) return;

    const decay = event.isPermanent
      ? 1                                       // full impact forever
      : Math.max(0, 1 - (weeksAgo * 0.1));     // existing decay

    score += event.impact * decay;
  });

  return Math.max(0, Math.min(100, Math.round(score)));
}
```

`calculateTargetScore` gets the identical change (same `event.isPermanent ? 1 : Math.max(0, 1 - (weeksAgo * 0.1))` guard).

---

## 4. Trophy/Promotion Fan Events — `src/engine/SeasonTransitionService.ts`

### New exported function

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
    return; // title win subsumes promotion — don't also fire 'promoted'
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

### Call site in `performSeasonTransition`

After the existing `awardSeasonTrophies(...)` call (currently the last line of `performSeasonTransition`):

```ts
awardSeasonTrophies(snapshot, pyramidLeagues, responseLeagues);
awardSeasonFanEvents(snapshot);   // NEW — last line
```

---

## 5. Scope Boundaries

- No UI changes — fan score already surfaces in the app via `FanEngine.calculateScore`
- No new stores or store fields on `Club`
- `clearAllClubData` continues to wipe `fan-store` on new game (correct — fresh start)
- `resetInMemoryStores` does not touch fan-store (correct — mid-session reset leaves history intact)
- NPC clubs do not get fan events (only the AMP's season outcome is in `snapshot`)
- Simultaneous promotion + relegation on the same club is impossible by game rules, but the `if`/`if` guard handles it safely (both would fire independently)
