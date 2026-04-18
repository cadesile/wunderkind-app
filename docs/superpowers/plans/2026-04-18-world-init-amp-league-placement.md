# World Init: AMP League Placement + Storage Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the AMP club into the lowest-tier league at world init, harden club data storage so failures surface loudly, and guard the backend against depleted player pools.

**Architecture:** `setFromWorldPack` gains three responsibilities after building club data: (1) verify each AsyncStorage write round-trips, (2) detect the bottom league and store `ampLeagueId`, (3) wire `leagueStore` and `fixtureStore` from the world data. The backend init endpoint gains a pool-size pre-flight check that returns 412 before committing to initialization work.

**Tech Stack:** TypeScript, Zustand, AsyncStorage, Expo Router, PHP 8.4 / Symfony, Doctrine ORM, Lando

---

## Prerequisites

There are unresolved merge conflicts in `src/api/syncQueue.ts` and `src/engine/GameLoop.ts`. Resolve these before starting any task — they will block commits.

```bash
git status  # confirm both files show "both modified"
# Open each file, resolve <<<<< / ===== / >>>>> markers, then:
git add src/api/syncQueue.ts src/engine/GameLoop.ts
git commit -m "fix: resolve merge conflicts in syncQueue and GameLoop"
```

---

## File Map

| File | What changes |
|---|---|
| `src/stores/fixtureStore.ts` | New action `generateFixturesFromWorldLeague` |
| `src/stores/worldStore.ts` | New state fields; hardened `setFromWorldPack`; safe-parse `loadClubs`; imports for cross-store wiring |
| `wunderkind-backend/src/Controller/InitializeController.php` | Pool pre-flight check + `PlayerRepository` injection |

---

## Task 1: Backend pool pre-flight guard

**Files:**
- Modify: `wunderkind-backend/src/Controller/InitializeController.php`

- [ ] **Step 1: Inject `PlayerRepository` into the controller**

Replace the constructor:

```php
use App\Repository\PlayerRepository;

public function __construct(
    private readonly ClubRepository             $clubRepository,
    private readonly WorldInitializationService $worldInitializationService,
    private readonly PlayerRepository           $playerRepository,
) {}
```

- [ ] **Step 2: Add the pool constant and guard**

Add the constant and the guard block immediately before the `$worldPack = ...` call:

```php
private const MIN_POOL_SIZE = 500;

#[Route('/initialize', name: 'api_initialize', methods: ['POST'])]
public function initialize(): JsonResponse
{
    /** @var User $user */
    $user = $this->getUser();
    $club = $this->clubRepository->findByUser($user);

    if ($club === null) {
        return $this->json(['error' => 'Club not found.'], Response::HTTP_NOT_FOUND);
    }

    if ($club->getCountry() === null) {
        return $this->json(
            ['error' => 'Club must have a country set before initialization.'],
            Response::HTTP_UNPROCESSABLE_ENTITY,
        );
    }

    if ($club->isWorldInitialized()) {
        return $this->json(
            ['error' => 'World already initialized for this club.'],
            Response::HTTP_CONFLICT,
        );
    }

    $poolCount = $this->playerRepository->countInPool();
    if ($poolCount < self::MIN_POOL_SIZE) {
        return $this->json(
            ['error' => "Player pool too small ({$poolCount} players). Run GenerateMarketDataCommand first."],
            Response::HTTP_PRECONDITION_FAILED,
        );
    }

    $worldPack = $this->worldInitializationService->initialize($club);

    return $this->json(['worldPack' => $worldPack]);
}
```

- [ ] **Step 3: Update the docblock**

```php
/**
 * POST /api/initialize
 *
 * One-time world initialization. Assembles the full world pack for the club's
 * country and returns it to the client. Guards:
 *   - 422 if club has no country set
 *   - 409 if already initialized (worldInitializedAt is set)
 *   - 412 if player pool has fewer than MIN_POOL_SIZE players
 */
```

- [ ] **Step 4: Verify**

With the backend running (`lando start`), reset `worldInitializedAt` on your test club, drain the pool to < 500 players via psql, then trigger world init from the app or via curl:

```bash
curl -s -X POST http://wunderkind.lndo.site/api/initialize \
  -H "Authorization: Bearer <your-jwt>" | jq .
```

Expected: `{"error": "Player pool too small (N players). Run GenerateMarketDataCommand first."}` with HTTP 412.

Restore the pool with `lando php bin/console app:generate-market-data` before continuing.

- [ ] **Step 5: Commit**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend
git add src/Controller/InitializeController.php
git commit -m "feat: guard /api/initialize against depleted player pool (412)"
```

---

## Task 2: `fixtureStore` — add `generateFixturesFromWorldLeague`

**Files:**
- Modify: `src/stores/fixtureStore.ts`

- [ ] **Step 1: Add the `WorldLeague` import**

At the top of `src/stores/fixtureStore.ts`, add:

```ts
import type { WorldLeague } from '@/types/world';
```

- [ ] **Step 2: Add the action to the `FixtureActions` interface**

```ts
interface FixtureActions {
  generateFixtures: (league: LeagueSnapshot, ampClubId: string) => void;
  /** Generate fixtures from a WorldLeague (used at world init when no LeagueSnapshot exists yet). */
  generateFixturesFromWorldLeague: (league: WorldLeague, ampClubId: string, season: number) => void;
  recordResult: (fixtureId: string, result: Omit<FixtureResult, 'synced'>) => void;
  advanceMatchday: () => void;
  markSynced: (fixtureIds: string[]) => void;
  clearSeason: () => void;
  getUnsyncedResults: () => Fixture[];
}
```

- [ ] **Step 3: Implement `generateFixturesFromWorldLeague` in the store body**

Add this action immediately after the closing brace of `generateFixtures`:

```ts
generateFixturesFromWorldLeague: (league, ampClubId, season) => {
  const { fixtures } = get();
  const alreadyGenerated = fixtures.some(
    (f) => f.leagueId === league.id && f.season === season
  );
  if (alreadyGenerated) return;

  const participants = [ampClubId, ...league.clubIds];
  const generated = generateRoundRobin(participants);

  const newFixtures: Fixture[] = generated.map((g) => ({
    id: `${league.id}-s${season}-r${g.round}-${g.homeClubId}-${g.awayClubId}`,
    leagueId: league.id,
    season,
    round: g.round,
    homeClubId: g.homeClubId,
    awayClubId: g.awayClubId,
    result: null,
  }));

  set((state) => ({
    fixtures: [...state.fixtures, ...newFixtures],
    currentMatchday: 1,
  }));
},
```

- [ ] **Step 4: Verify the TypeScript compiles**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx tsc --noEmit
```

Expected: no errors related to `fixtureStore.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/stores/fixtureStore.ts
git commit -m "feat: add generateFixturesFromWorldLeague to fixtureStore"
```

---

## Task 3: `worldStore` — new state fields + safe-parse `loadClubs`

**Files:**
- Modify: `src/stores/worldStore.ts`

This task adds the two new state fields and hardens `loadClubs`. The `setFromWorldPack` changes come in Task 4.

- [ ] **Step 1: Add `ampLeagueId` and `clubsLoadError` to the `WorldState` interface**

```ts
interface WorldState {
  isInitialized: boolean;
  leagues: WorldLeague[];
  /** In-memory club map indexed by clubId. NOT persisted via Zustand — loaded via loadClubs(). */
  clubs: Record<string, WorldClub>;
  /** ID of the WorldLeague the AMP was placed into at world init. Persisted. */
  ampLeagueId: string | null;
  /** null = ok; non-null = one or more league club keys failed to parse on last loadClubs() call. NOT persisted. */
  clubsLoadError: string | null;
  loadClubs: () => Promise<void>;
  setFromWorldPack: (pack: WorldPackResponse['worldPack']) => Promise<void>;
  getClub: (clubId: string) => WorldClub | undefined;
  getLeagueClubs: (leagueId: string) => WorldClub[];
}
```

- [ ] **Step 2: Add initial values for both fields in the store body**

```ts
(set, get) => ({
  isInitialized: false,
  leagues: [],
  clubs: {},
  ampLeagueId: null,
  clubsLoadError: null,
  // ...actions
```

- [ ] **Step 3: Add `ampLeagueId` to `partialize`**

```ts
partialize: (state) => ({
  isInitialized: state.isInitialized,
  leagues:       state.leagues,
  ampLeagueId:   state.ampLeagueId,
  // clubs excluded — stored per-league in AsyncStorage
  // clubsLoadError excluded — transient, reset each loadClubs() call
}),
```

- [ ] **Step 4: Harden `loadClubs` with safe-parse and error state**

Replace the existing `loadClubs` implementation:

```ts
loadClubs: async () => {
  const { leagues } = get();
  if (leagues.length === 0) return;

  const clubs: Record<string, WorldClub> = {};
  const errors: string[] = [];

  for (const league of leagues) {
    const raw = await AsyncStorage.getItem(`${CLUBS_KEY_PREFIX}${league.id}`);
    if (raw) {
      try {
        const leagueClubs = JSON.parse(raw) as Record<string, WorldClub>;
        Object.assign(clubs, leagueClubs);
      } catch (e) {
        console.warn(`[WorldStore] Failed to parse clubs for league ${league.id}:`, e);
        errors.push(`league ${league.id}: ${String(e)}`);
      }
    }
  }

  set({
    clubs,
    clubsLoadError: errors.length > 0 ? errors.join('; ') : null,
  });
},
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "Property 'ampLeagueId' does not exist", double-check all three locations: interface, initial state, and `partialize`.

- [ ] **Step 6: Commit**

```bash
git add src/stores/worldStore.ts
git commit -m "feat: add ampLeagueId + clubsLoadError to worldStore; harden loadClubs"
```

---

## Task 4: `worldStore` — harden `setFromWorldPack` + AMP league placement

**Files:**
- Modify: `src/stores/worldStore.ts`

This task requires Tasks 2 and 3 to be complete. It rewrites `setFromWorldPack` to verify writes, detect the bottom league, and wire `leagueStore` + `fixtureStore`.

- [ ] **Step 1: Add cross-store and type imports**

At the top of `src/stores/worldStore.ts`, add:

```ts
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import type { ClubSnapshot, LeagueSnapshot } from '@/types/api';
```

Keep the existing imports (`AsyncStorage`, `create`, `persist`, `zustandStorage`, `WorldClub`, `WorldLeague`, `WorldPackResponse`).

- [ ] **Step 2: Replace `setFromWorldPack` with the hardened + placement version**

```ts
setFromWorldPack: async (pack) => {
  const { club } = useClubStore.getState();
  const ampClubId  = club.id;
  const ampCountry = club.country ?? '';

  const leagues: WorldLeague[] = [];
  const clubs: Record<string, WorldClub> = {};

  for (const leagueData of pack.leagues) {
    const clubIds = leagueData.clubs.map((c) => c.id);
    leagues.push({
      id:             leagueData.id,
      tier:           leagueData.tier,
      name:           leagueData.name,
      country:        leagueData.country,
      promotionSpots: leagueData.promotionSpots,
      reputationTier: leagueData.reputationTier,
      clubIds,
    });

    const leagueClubMap: Record<string, WorldClub> = {};
    for (const worldClub of leagueData.clubs) {
      clubs[worldClub.id] = worldClub;
      leagueClubMap[worldClub.id] = worldClub;
    }

    const key = `${CLUBS_KEY_PREFIX}${leagueData.id}`;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(leagueClubMap));

      // Verify round-trip — catch silent storage failures before pool is depleted
      const verification = await AsyncStorage.getItem(key);
      if (!verification) {
        throw new Error(`storage write did not persist`);
      }
      const parsed = JSON.parse(verification) as Record<string, WorldClub>;
      if (Object.keys(parsed).length === 0) {
        throw new Error(`persisted club map is empty`);
      }
    } catch (err) {
      throw new Error(
        `[WorldStore] Failed to store clubs for league ${leagueData.id}: ${String(err)}`
      );
    }
  }

  // Highest tier number = lowest prestige league = where AMP starts
  const bottomLeague = leagues
    .filter((l) => l.country === ampCountry)
    .sort((a, b) => b.tier - a.tier)[0] ?? null;

  set({ isInitialized: true, leagues, clubs, ampLeagueId: bottomLeague?.id ?? null });

  if (bottomLeague) {
    // Build ClubSnapshot[] — WorldClub is a superset of ClubSnapshot
    const clubSnapshots: ClubSnapshot[] = bottomLeague.clubIds
      .map((id) => clubs[id])
      .filter((c): c is WorldClub => c !== undefined)
      .map((c) => ({
        id:             c.id,
        name:           c.name,
        reputation:     c.reputation,
        tier:           c.tier,
        primaryColor:   c.primaryColor,
        secondaryColor: c.secondaryColor,
        stadiumName:    c.stadiumName,
        facilities:     c.facilities,
      }));

    const syntheticLeague: LeagueSnapshot = {
      id:                            bottomLeague.id,
      tier:                          bottomLeague.tier,
      name:                          bottomLeague.name,
      country:                       bottomLeague.country,
      season:                        1,
      promotionSpots:                bottomLeague.promotionSpots,
      reputationTier:                bottomLeague.reputationTier as LeagueSnapshot['reputationTier'],
      tvDeal:                        null,
      sponsorPot:                    0,
      prizeMoney:                    null,
      leaguePositionPot:             null,
      leaguePositionDecreasePercent: 0,
      clubs:                         clubSnapshots,
    };

    useLeagueStore.getState().setFromSync(syntheticLeague);
    useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, ampClubId, 1);
  }
},
```

- [ ] **Step 3: Upgrade the error log in `useAuthFlow.ts`**

Find the catch block around `initializeWorld()` in `src/hooks/useAuthFlow.ts` (around line 375). Change `console.warn` to `console.error` so storage failures are unmissable in dev:

```ts
} catch (err) {
  console.error('[useAuthFlow] World initialization failed — squad will be empty:', err);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Common issues to watch for:
- `reputationTier` cast: `WorldLeague.reputationTier` is `string | null`; `LeagueSnapshot.reputationTier` is the union literal. The `as LeagueSnapshot['reputationTier']` cast handles this.
- Missing import: ensure all four new imports from Step 1 are present.

- [ ] **Step 5: End-to-end verify in the app**

> Prerequisite: backend pool must have ≥ 500 players. Run `lando php bin/console app:generate-market-data` if needed. Reset `worldInitializedAt` to NULL in psql: `UPDATE club SET world_initialized_at = NULL WHERE id = '<your-club-id>';`
> Clear AsyncStorage by uninstalling and reinstalling the app on your device/simulator.

1. Launch the app and complete onboarding through to world init.
2. In the Expo logger, confirm no `[WorldStore]` errors appear.
3. Open the BROWSE tab → LEAGUE tab. Confirm the league shown is the bottom tier (highest tier number) in your country.
4. Tap any NPC club in the league → confirm PLAYERS shows a non-zero count.
5. In the Expo debugger, run:
   ```js
   require('@/stores/worldStore').useWorldStore.getState().ampLeagueId
   // Expected: a UUID string (not null)

   require('@/stores/fixtureStore').useFixtureStore.getState().fixtures.length
   // Expected: > 0

   require('@/stores/leagueStore').useLeagueStore.getState().league
   // Expected: object with id, name, clubs array
   ```

- [ ] **Step 6: Commit**

```bash
git add src/stores/worldStore.ts src/hooks/useAuthFlow.ts
git commit -m "feat: harden setFromWorldPack with write verification + AMP league placement"
```

---

## Self-Review Checklist (for plan author — not a task)

**Spec coverage:**
- ✅ Section 1a (`ampLeagueId` persisted) → Task 3 Step 1–3
- ✅ Section 1b (bottom league detection) → Task 4 Step 2
- ✅ Section 1c (`leagueStore.setFromSync` with synthetic snapshot) → Task 4 Step 2
- ✅ Section 1d (`generateFixturesFromWorldLeague`) → Task 2
- ✅ Section 2a (write verification + rethrow) → Task 4 Step 2
- ✅ Section 2b (`clubsLoadError` + safe parse) → Task 3 Step 4–5
- ✅ Section 3 (backend 412 guard) → Task 1

**Type consistency:** `WorldLeague`, `WorldClub`, `ClubSnapshot`, `LeagueSnapshot` used consistently across Tasks 2–4. `generateFixturesFromWorldLeague` signature matches between Task 2 (definition) and Task 4 (call site).

**No placeholders:** all steps contain complete code.
