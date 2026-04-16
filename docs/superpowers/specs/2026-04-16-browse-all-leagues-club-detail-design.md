# Browse: All Leagues + Club Detail Screen

**Date:** 2026-04-16
**Status:** Approved

---

## Problem

The BROWSE tab only shows the user's current league. There is no way to explore other tiers, and clubs are not tappable.

---

## Goal

1. Show the full national league pyramid (all tiers) in BROWSE.
2. Make every club row tappable — NPC clubs navigate to a new club detail screen; the user's own academy navigates to the squad screen.

---

## Data

All required data is already on-device in `worldStore`:
- `leagues: WorldLeague[]` — all leagues for the country, with `tier`, `name`, `promotionSpots`, `clubIds`
- `clubs: Record<string, WorldClub>` — full club objects including `players[]` and `staff[]`

No new API calls or backend changes needed.

---

## Architecture

### 1. `competitions.tsx` — pass world data into LeagueBrowser

Add `useWorldStore` reads and pass `worldLeagues` + `worldClubs` as props to `LeagueBrowser`.

```tsx
const worldLeagues = useWorldStore((s) => s.leagues);
const worldClubs   = useWorldStore((s) => s.clubs);

<LeagueBrowser
  league={league}
  fixtures={fixtures}
  ampClubId={ampClubId}
  ampName={ampName}
  worldLeagues={worldLeagues}
  worldClubs={worldClubs}
/>
```

### 2. `LeagueBrowser` — render full pyramid

**Props added:** `worldLeagues: WorldLeague[]`, `worldClubs: Record<string, WorldClub>`

**Behaviour:**
- Sort `worldLeagues` by `tier` ascending (T1 at top).
- Fall back to the existing single `league` entry if `worldLeagues` is empty (keeps backward compat while world is loading).
- For the AMP league (`lg.id === league.id`): expand to `LeagueTable` (existing component, rows made tappable via `onClubPress`).
- For all other leagues: expand to `WorldClubList` (new component).
- `handleClubPress(clubId)`: if `clubId === ampClubId` → `router.push('/(tabs)/squad')`; otherwise → `router.push('/club/' + clubId)`.

### 3. `LeagueTable` — tappable rows

**Prop added:** `onClubPress?: (clubId: string) => void`

Each standings row wrapped in `<Pressable onPress={() => onClubPress?.(row.clubId)}>`. No visual change when `onClubPress` is undefined (existing LEAGUE tab usage unchanged).

### 4. `WorldClubList` (new component)

**Path:** `src/components/competitions/WorldClubList.tsx`
**Props:** `clubs: WorldClub[]`, `onClubPress: (clubId: string) => void`

Renders a flat list of club rows, sorted by `reputation` descending. Each row:
- Color dot (2×2 square, `primaryColor`)
- Club name (flex-1)
- Reputation number (right-aligned, dimmed)
- ChevronRight icon

Tapping a row calls `onClubPress(club.id)`.

### 5. `app/club/[id].tsx` (new screen)

Reads `id` from `useLocalSearchParams()`. Fetches club via `worldStore.getClub(id)`. Shows 404-style message if not found.

**Layout:**
```
┌─────────────────────────────────────┐
│ [←]  Club Name              [T3]   │  ← header: back button, tier badge
│      Stadium Name                   │
│      ██████ primaryColor swatch    │
├─────────────────────────────────────┤
│  PLAYERS  (n)                       │  ← section header
│  #  Name            POS   OVR      │  ← column headers
│  1  J. Rossi        MID    72      │
│  2  A. Silva        DEF    68      │
│  ...                                │
└─────────────────────────────────────┘
```

**Player rows:**
- Index (#), full name truncated, position badge, OVR (avg of pace/technical/vision/power/stamina/heart, rounded)
- Sorted by OVR descending
- No attributes exposed — summary only

**Navigation:** Uses Expo Router stack. Back button returns to competitions/BROWSE.

---

## Routing

| Tap target | Destination |
|---|---|
| NPC club (any league) | `router.push('/club/' + clubId)` |
| AMP club (in standings) | `router.push('/(tabs)/squad')` |

The AMP club is not present in `worldStore.clubs` (it is not an NPC), so the club detail screen will never be reached for it. The routing guard is in `LeagueBrowser.handleClubPress`.

---

## Out of Scope

- NPC league standings (requires fixture engine — post phase 4)
- Club personality / staff tab on club detail screen (can be added later)
- Search or filter across clubs
- AMP club appearing in `worldStore` (it is a user-owned entity, not an NPC)
