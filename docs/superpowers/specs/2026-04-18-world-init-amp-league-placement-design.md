# World Init: AMP League Placement + Storage Hardening

**Date:** 2026-04-18
**Status:** Approved

---

## Problem

Two compounding issues block reliable world simulation from day one:

1. **NPC clubs show empty rosters after init.** `setFromWorldPack` writes club data (including players) to AsyncStorage, but storage failures are swallowed silently. Because the backend pool is depleted after init, there is no recovery path — the one-shot window is lost with no error surfaced.

2. **AMP club has no league.** At world init, the AMP is not placed into any league. `leagueStore` is null, `fixtureStore` has no fixtures, and the simulation engine has nothing to run against NPC opponents.

---

## Goal

1. Place the AMP club into the lowest-tier league in its country at the moment `setFromWorldPack` runs — no subsequent user action required.
2. Make `setFromWorldPack` storage writes verifiable and failure-loud, so silent data loss is impossible.
3. Guard the backend init endpoint against depleted pools before they silently produce empty club rosters.

---

## Architecture

### Data flow after this change

```
POST /api/initialize
  → backend validates pool size (≥ MIN_POOL_SIZE) → 412 if not
  → returns worldPack { leagues: [...clubs[...players]], ampStarter }

setFromWorldPack(pack)
  → build leagues[], clubs{}
  → write clubs to AsyncStorage per league
  → verify each write round-trips (read back + key count check)
  → find bottom league (max tier, country = AMP country)
  → set { isInitialized, leagues, clubs, ampLeagueId }
  → build synthetic LeagueSnapshot from bottom league + worldStore.clubs
  → leagueStore.setFromSync(syntheticLeague)
  → fixtureStore.generateFixturesFromWorldLeague(bottomLeague, ampClubId, season=1)
```

---

## Section 1: AMP League Placement

### 1a. `worldStore` — new persisted field

```ts
interface WorldState {
  // existing...
  /** ID of the WorldLeague the AMP was placed into at world init. */
  ampLeagueId: string | null;
}
```

Added to `partialize` so it survives app restarts.

### 1b. `setFromWorldPack` — bottom league detection

After `leagues[]` and `clubs{}` are built, before calling `set()`:

1. Read `ampClubId` and `ampCountry` from `useClubStore.getState().club` — both are set before world init runs.
2. Find the bottom league:
   ```ts
   const bottomLeague = leagues
     .filter((l) => l.country === ampCountry)
     .sort((a, b) => b.tier - a.tier)[0]; // highest tier number = lowest prestige
   ```
3. Include `ampLeagueId: bottomLeague?.id ?? null` in the `set()` call.

### 1c. `leagueStore` — synthetic LeagueSnapshot at init time

After `set()` runs (so `clubs` is in-memory), build a `LeagueSnapshot` from the bottom league:

- `id`, `tier`, `name`, `country` from `WorldLeague`
- `season: 1`
- `clubs`: map `bottomLeague.clubIds` → look up each in `clubs` (already in memory) → pick `ClubSnapshot` fields (`id`, `name`, `reputation`, `tier`, `primaryColor`, `secondaryColor`, `stadiumName`, `facilities`). `WorldClub` is a superset of `ClubSnapshot`, so this is a direct field pick.
- Financial fields (`tvDeal`, `sponsorPot`, `prizeMoney`, `leaguePositionPot`, `leaguePositionDecreasePercent`, `promotionSpots`, `reputationTier`): carry over from `WorldLeague` where available (`promotionSpots`, `reputationTier`); set `tvDeal: null`, `sponsorPot: 0`, `prizeMoney: null`, `leaguePositionPot: null`, `leaguePositionDecreasePercent: 0`.

Then: `leagueStore.setFromSync(syntheticLeague)`.

### 1d. `fixtureStore` — new action

```ts
generateFixturesFromWorldLeague(
  league: WorldLeague,
  ampClubId: string,
  season: number,
): void
```

- Idempotency guard: skip if any fixture with `leagueId === league.id && season === season` already exists.
- Participants: `[ampClubId, ...league.clubIds]`
- Generate round-robin via existing `generateRoundRobin(participants)`.
- Build `Fixture[]` with `leagueId: league.id`, `season`, `round`, `homeClubId`, `awayClubId`, `result: null`.
- Append to `fixtures` state; set `currentMatchday: 1`.

Called from `setFromWorldPack` after `leagueStore.setFromSync`.

---

## Section 2: Storage Hardening in `worldStore`

### 2a. `setFromWorldPack` — write verification

Each AsyncStorage write is verified immediately:

```ts
await AsyncStorage.setItem(key, JSON.stringify(leagueClubMap));

// Verify round-trip
const verification = await AsyncStorage.getItem(key);
if (!verification) {
  throw new Error(`WorldStore: storage write did not persist for league ${leagueData.id}`);
}
const parsed = JSON.parse(verification) as Record<string, WorldClub>;
if (Object.keys(parsed).length === 0) {
  throw new Error(`WorldStore: persisted club map is empty for league ${leagueData.id}`);
}
```

The full per-league loop is wrapped in a try/catch that rethrows — any single league failure aborts the whole operation cleanly. The error propagates to the `try/catch` in `useAuthFlow.ts` and is logged as `console.error` (not `console.warn`), making it visible in dev.

### 2b. `loadClubs` — safe parse + error state

New state field:

```ts
/** null = ok; non-null = one or more league club keys failed to parse */
clubsLoadError: string | null;
```

Not persisted (reset to null on each `loadClubs` call). Per-league parse is wrapped in try/catch:

```ts
try {
  const leagueClubs = JSON.parse(raw) as Record<string, WorldClub>;
  Object.assign(clubs, leagueClubs);
} catch (e) {
  errors.push(`league ${league.id}: ${String(e)}`);
}
```

After the loop: `set({ clubs, clubsLoadError: errors.length > 0 ? errors.join('; ') : null })`.

Components can read `clubsLoadError` to show a recovery message instead of silently rendering empty rosters.

---

## Section 3: Backend Pool Validation

### `InitializeController` — pre-flight pool check

```php
private const MIN_POOL_SIZE = 500;

public function initialize(): JsonResponse
{
    // ... existing guards (club not found, no country, already initialized) ...

    $poolCount = $this->playerRepository->countInPool();
    if ($poolCount < self::MIN_POOL_SIZE) {
        return $this->json(
            ['error' => "Player pool too small ({$poolCount} players). Run GenerateMarketDataCommand first."],
            Response::HTTP_PRECONDITION_FAILED, // 412
        );
    }

    $worldPack = $this->worldInitializationService->initialize($club);
    return $this->json(['worldPack' => $worldPack]);
}
```

### Client handling

`useAuthFlow.ts` already wraps `initializeWorld()` in try/catch. The `ApiError` with status 412 is treated identically to other non-retryable errors — logged via `console.error` with the backend message. No user-visible change; this is a developer-facing guard.

---

## Files Modified

| File | Change |
|---|---|
| `src/stores/worldStore.ts` | Add `ampLeagueId`, `clubsLoadError`; harden `setFromWorldPack`; safe-parse `loadClubs`; wire `leagueStore` + `fixtureStore` calls |
| `src/stores/fixtureStore.ts` | Add `generateFixturesFromWorldLeague` action |
| `wunderkind-backend/src/Controller/InitializeController.php` | Add `MIN_POOL_SIZE` constant + pool pre-flight check |

---

## Out of Scope

- NPC-vs-NPC match simulation for leagues the AMP is not in
- Promotion/relegation at season end
- Sync response driving league re-assignment (backend currently returns `league: LeagueSnapshot | null`; this spec does not change that — sync continues to work as-is)
- Device transfer / world pack re-fetch (recovery from complete data loss on a new device)
