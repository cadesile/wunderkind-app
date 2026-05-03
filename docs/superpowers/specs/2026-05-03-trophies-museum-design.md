# Trophies & Museum — Design Spec

**Goal:** Record league title wins for both the AMP club and NPC clubs, persist them in `clubStore` / `worldStore`, and expose a Museum screen (`app/museum.tsx`) navigable from Office > Stadium.

**Architecture:** `TrophyRecord` embedded in the `Club` and `WorldClub` interfaces. Trophy awarding happens inside `SeasonTransitionService.performSeasonTransition` immediately after season history is recorded. The Museum is a dedicated route with a trophy list and full final-standings snapshot per trophy.

**Tech Stack:** TypeScript / React Native / Zustand (AsyncStorage persist) / Expo Router / Lucide icons

---

## 1. Data Model

### `src/types/club.ts`

Add two new interfaces alongside the existing `Club`, `SponsorContract`, etc.:

```ts
export interface TrophyStandingEntry {
  clubId:         string;
  clubName:       string;
  position:       number;
  wins:           number;
  draws:          number;
  losses:         number;
  points:         number;
  goalDifference: number;
}

export interface TrophyRecord {
  type:          'league_title';  // union-extensible for future cup wins
  tier:          number;          // 1 (top) – 8 (bottom)
  leagueName:    string;
  season:        number;
  weekCompleted: number;
  wins:          number;
  draws:         number;
  losses:        number;
  points:        number;
  goalsFor:      number;
  goalsAgainst:  number;
  standings:     TrophyStandingEntry[];  // full final-table snapshot
}
```

Add to `Club` interface:
```ts
trophies: TrophyRecord[];
```

### `src/types/world.ts`

Add to `WorldClub` interface (optional for backward-compat with existing serialized NPC data):
```ts
trophies?: TrophyRecord[];
```

Import `TrophyRecord` from `./club`.

---

## 2. Store Changes

### `src/stores/clubStore.ts`

- `DEFAULT_CLUB` gets `trophies: []`
- Add to `ClubState` interface: `addTrophy: (record: TrophyRecord) => void`
- Implementation: appends to `club.trophies` via `set`

### `src/stores/worldStore.ts`

- Add `addTrophyToClub: (clubId: string, trophy: TrophyRecord) => void`
- Reads the club's `trophies ?? []`, appends, then persists via the existing `mutateClub` pattern (same bucket used for roster mutations)

### `src/stores/resetAllStores.ts`

**No changes needed.**
- `resetInMemoryStores` already does `useClubStore.setState({ club: DEFAULT_CLUB })` — `trophies: []` is included via `DEFAULT_CLUB`
- `useWorldStore.setState({ clubs: {} })` wipes all NPC club data including trophies
- No new AsyncStorage key required (trophies are embedded in existing stores)

---

## 3. Trophy Awarding

### `src/engine/SeasonTransitionService.ts`

Add a new pure helper called at the end of `performSeasonTransition`, after `retireAMPPlayers`:

```ts
function awardSeasonTrophies(
  snapshot: SeasonTransitionSnapshot,
  pyramidLeagues: PyramidLeague[],
  responseLeagues: SeasonUpdateLeague[],
): void
```

**AMP trophy:**
- If `snapshot.finalPosition === 1`, build a `TrophyRecord` from snapshot fields and call `useClubStore.getState().addTrophy(record)`
- `standings` built from `snapshot.displayStandings` mapped to `TrophyStandingEntry[]`

**NPC trophies:**
- For each `PyramidLeague` in `pyramidLeagues`, find the club at position 1 (`standings[0].clubId`) where `!standings[0].isAmp`
- Look up the league name from `responseLeagues` by matching `leagueId`
- Build a `TrophyRecord` (standings field populated from `buildLeagueStandings` results — the pts/gd/gf counters already computed)
- Call `useWorldStore.getState().addTrophyToClub(clubId, record)`

Call site in `performSeasonTransition`:
```ts
awardSeasonTrophies(snapshot, pyramidLeagues, responseLeagues);
```
(after `retireAMPPlayers` call)

---

## 4. Museum UI

### `app/museum.tsx`

New dedicated route. Same pixel-art patterns as `app/club/[id].tsx`.

**Structure:**
- `SafeAreaView` (flex 1, WK.greenDark bg) + `PitchBackground`
- Header row: back chevron (`ChevronLeft`) + `Trophy` icon (Lucide, WK.yellow) + `MUSEUM` pixel title
- Reads `useClubStore((s) => s.club.trophies)`
- Renders `[...trophies].reverse()` (newest first)

**Empty state** (`trophies.length === 0`):
- Centered card with `"NO TROPHIES YET"` in dim pixel text

**Trophy card** (one per `TrophyRecord`):
- Card header (`WK.tealDark` background): league name left-aligned + tier badge (`T{tier}`) right-aligned
- Stat row: Season N, W/D/L record, Pts — compact horizontal layout matching SeasonEndOverlay AMP summary
- Final table: rows identical to SeasonEndOverlay league table (position, club name, played, GD, pts); AMP row highlighted in yellow

**Navigation:**
- Back button calls `router.back()`

### `app/(tabs)/office.tsx` — STADIUM tab

Below `StadiumOverviewCard`, add:

```tsx
<TouchableOpacity
  onPress={() => router.push('/museum')}
  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ... }}
>
  <PixelText size={8} color={WK.yellow}>VIEW MUSEUM</PixelText>
  <ChevronRight size={14} color={WK.dim} />
</TouchableOpacity>
```

---

## 5. Scope Boundaries

- No backend API changes — trophies are 100% client-side
- No cup/tournament trophies in this spec — `type: 'league_title'` only; the union type makes future extension non-breaking
- Museum shows only AMP trophies (`clubStore`) — NPC trophies are stored in `worldStore` for data integrity and future NPC club detail screens
- `leagueHistoryStore` is unchanged — it remains the source of truth for full season history; `TrophyRecord.standings` is a separate, trophy-scoped snapshot
