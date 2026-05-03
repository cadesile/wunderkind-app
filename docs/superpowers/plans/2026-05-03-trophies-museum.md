# Trophies & Museum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record league title wins for AMP and NPC clubs, persist them in existing stores, and expose a Museum screen navigable from Office > Stadium.

**Architecture:** `TrophyRecord` embedded in `Club` (clubStore) and `WorldClub` (worldStore). Trophy awarding runs at end of `performSeasonTransition`. Museum is a new Expo Router screen at `app/museum.tsx`.

**Tech Stack:** TypeScript, React Native, Zustand + AsyncStorage persist, Expo Router, Lucide React Native, Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/club.ts` | Modify | Add `TrophyStandingEntry`, `TrophyRecord`; add `trophies` to `Club` |
| `src/types/world.ts` | Modify | Add `trophies?: TrophyRecord[]` to `WorldClub` |
| `src/stores/clubStore.ts` | Modify | Add `addTrophy` action + `DEFAULT_CLUB.trophies` |
| `src/stores/worldStore.ts` | Modify | Add `addTrophyToClub` action |
| `src/engine/SeasonTransitionService.ts` | Modify | Add `buildRichStandings`, `awardSeasonTrophies`; call in orchestrator |
| `src/__tests__/engine/SeasonTransitionService.test.ts` | Modify | Tests for `awardSeasonTrophies`; update existing mocks |
| `app/museum.tsx` | Create | Museum screen — trophy list with standings snapshots |
| `app/(tabs)/office.tsx` | Modify | Add "VIEW MUSEUM →" button in STADIUM tab |

---

## Task 1: Add TrophyRecord types to club.ts and WorldClub

**Files:**
- Modify: `src/types/club.ts`
- Modify: `src/types/world.ts`

- [ ] **Step 1: Add TrophyStandingEntry and TrophyRecord to src/types/club.ts**

Insert the following two interfaces immediately before the `export interface Club {` line (line 74):

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
  type:          'league_title';
  tier:          number;
  leagueName:    string;
  season:        number;
  weekCompleted: number;
  wins:          number;
  draws:         number;
  losses:        number;
  points:        number;
  goalsFor:      number;
  goalsAgainst:  number;
  standings:     TrophyStandingEntry[];
}
```

- [ ] **Step 2: Add trophies field to the Club interface**

Inside `export interface Club {` (currently ends around line 118), add after `badgeShape?`:

```ts
  /** All league titles won by this club, oldest first. */
  trophies: TrophyRecord[];
```

- [ ] **Step 3: Add trophies to WorldClub in src/types/world.ts**

Add this import at the top of `src/types/world.ts` (after existing imports):

```ts
import type { TrophyRecord } from './club';
```

Inside `export interface WorldClub {` (around line 48), add after the `formation` field:

```ts
  /** League titles won — populated at season end, optional for backward-compat. */
  trophies?: TrophyRecord[];
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No errors referencing `TrophyRecord`, `TrophyStandingEntry`, or `Club.trophies`.

- [ ] **Step 5: Commit**

```bash
git add src/types/club.ts src/types/world.ts
git commit -m "feat: add TrophyRecord and TrophyStandingEntry types to club and world"
```

---

## Task 2: Update clubStore with addTrophy action

**Files:**
- Modify: `src/stores/clubStore.ts`
- Test: `src/__tests__/stores/clubStore.test.ts`

- [ ] **Step 1: Write the failing test**

Open `src/__tests__/stores/clubStore.test.ts` and replace its contents with:

```ts
import { useClubStore, DEFAULT_CLUB } from '@/stores/clubStore';
import type { TrophyRecord } from '@/types/club';

const sampleTrophy: TrophyRecord = {
  type:          'league_title',
  tier:          8,
  leagueName:    'Test League',
  season:        1,
  weekCompleted: 38,
  wins:          20,
  draws:         5,
  losses:        3,
  points:        65,
  goalsFor:      60,
  goalsAgainst:  20,
  standings:     [],
};

describe('clubStore', () => {
  it('initializes with default club state', () => {
    const state = useClubStore.getState();
    expect(state.club).toBeDefined();
    expect(state.club.name).toBe('Wunderkind Factory');
  });

  it('DEFAULT_CLUB has empty trophies array', () => {
    expect(DEFAULT_CLUB.trophies).toEqual([]);
  });

  it('addTrophy appends a trophy to club.trophies', () => {
    useClubStore.setState({ club: { ...DEFAULT_CLUB, trophies: [] } });
    useClubStore.getState().addTrophy(sampleTrophy);
    expect(useClubStore.getState().club.trophies).toHaveLength(1);
    expect(useClubStore.getState().club.trophies[0].leagueName).toBe('Test League');
  });

  it('addTrophy preserves existing trophies', () => {
    useClubStore.setState({ club: { ...DEFAULT_CLUB, trophies: [sampleTrophy] } });
    const secondTrophy = { ...sampleTrophy, season: 2 };
    useClubStore.getState().addTrophy(secondTrophy);
    expect(useClubStore.getState().club.trophies).toHaveLength(2);
    expect(useClubStore.getState().club.trophies[1].season).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --testPathPattern=stores/clubStore --no-coverage`

Expected: FAIL — `addTrophy` is not a function.

- [ ] **Step 3: Add TrophyRecord import to clubStore.ts**

In `src/stores/clubStore.ts`, update the import from `@/types/club` (line 3) to include `TrophyRecord`:

```ts
import { Club, ReputationTier, ManagerPersonality, ManagerProfile, SponsorContract, TrophyRecord } from '@/types/club';
```

- [ ] **Step 4: Add addTrophy to ClubState interface**

In `src/stores/clubStore.ts`, inside the `interface ClubState {` block (after `setBadgeShape` on line ~62), add:

```ts
  /** Append a league title trophy to the club's trophy cabinet. */
  addTrophy: (record: TrophyRecord) => void;
```

- [ ] **Step 5: Add trophies to DEFAULT_CLUB and implement addTrophy**

In `DEFAULT_CLUB` (after `badgeShape: 'shield'` on line ~90), add:

```ts
  trophies: [],
```

At the end of the store implementation (after `setBadgeShape` action, before the closing `}`), add:

```ts
      addTrophy: (record) =>
        set((state) => ({
          club: {
            ...state.club,
            trophies: [...(state.club.trophies ?? []), record],
          },
        })),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest --testPathPattern=stores/clubStore --no-coverage`

Expected: PASS — 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/stores/clubStore.ts src/__tests__/stores/clubStore.test.ts
git commit -m "feat: add addTrophy action to clubStore"
```

---

## Task 3: Update worldStore with addTrophyToClub action

**Files:**
- Modify: `src/stores/worldStore.ts`

- [ ] **Step 1: Add TrophyRecord import to worldStore.ts**

In `src/stores/worldStore.ts`, update line 5 to add the import:

```ts
import type { WorldClub, WorldLeague, WorldPackResponse, WorldPlayer, SeasonUpdateLeague } from '@/types/world';
import type { TrophyRecord } from '@/types/club';
```

- [ ] **Step 2: Add addTrophyToClub to WorldState interface**

Inside `interface WorldState {` (before the closing `}` around line 65), add:

```ts
  /**
   * Append a trophy to an NPC club's trophies array and re-persist
   * the league's club map to AsyncStorage.
   */
  addTrophyToClub: (clubId: string, trophy: TrophyRecord) => Promise<void>;
```

- [ ] **Step 3: Implement addTrophyToClub in the store**

In the store implementation, after the `mutateClubRoster` action (after line ~347) and before `recordNpcAppearances`, add:

```ts
      addTrophyToClub: async (clubId, trophy) => {
        const { clubs, leagues } = get();
        const club = clubs[clubId];
        if (!club) return;

        const updatedClub = { ...club, trophies: [...(club.trophies ?? []), trophy] };

        // Update in-memory map
        set((s) => ({ clubs: { ...s.clubs, [clubId]: updatedClub } }));

        // Find which league this club belongs to and re-persist that league's clubs
        const leagueId = leagues.find((l) => l.clubIds.includes(clubId))?.id;
        if (!leagueId) return;

        const allLeagueClubs = get().getLeagueClubs(leagueId);
        const leagueClubMap: Record<string, WorldClub> = {};
        for (const c of allLeagueClubs) {
          leagueClubMap[c.id] = c.id === clubId ? updatedClub : c;
        }
        await AsyncStorage.setItem(
          `${CLUBS_KEY_PREFIX}${leagueId}`,
          JSON.stringify(leagueClubMap),
        );
      },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/stores/worldStore.ts
git commit -m "feat: add addTrophyToClub action to worldStore"
```

---

## Task 4: Add awardSeasonTrophies to SeasonTransitionService

**Files:**
- Modify: `src/engine/SeasonTransitionService.ts`
- Modify: `src/__tests__/engine/SeasonTransitionService.test.ts`

- [ ] **Step 1: Write failing tests**

Open `src/__tests__/engine/SeasonTransitionService.test.ts`. Find the line:

```ts
const mockAddTrophy = jest.fn();
```

It does not exist yet — add the following immediately after the `mockApplySeasonUpdate` declaration (around line 43):

```ts
const mockAddTrophy        = jest.fn();
const mockAddTrophyToClub  = jest.fn().mockResolvedValue(undefined);
```

Update the `jest.mock('@/stores/clubStore', ...)` block to include `addTrophy`:

```ts
jest.mock('@/stores/clubStore', () => ({
  useClubStore: { getState: () => ({ club: { id: 'amp-not-in-this-league' }, addTrophy: mockAddTrophy }) },
}));
```

Update the `jest.mock('@/stores/worldStore', ...)` block to include `addTrophyToClub`:

```ts
jest.mock('@/stores/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      clubs: {
        'c1': { id: 'c1', name: 'Club One', reputation: 50, tier: 8, primaryColor: '#ff0000', secondaryColor: '#000', stadiumName: null, facilities: {} },
      },
      leagues: [],
      applySeasonUpdate: mockApplySeasonUpdate,
      addTrophyToClub: mockAddTrophyToClub,
    }),
  },
}));
```

Update the `performSeasonTransition` describe block's `beforeEach` to include `addTrophy` and `addTrophyToClub` in their respective store mocks:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  concludeSeasonMock = jest.requireMock('@/api/endpoints/season').concludeSeason as jest.Mock;
  concludeSeasonMock.mockResolvedValue({ seasonRecordId: 'rec1', newLeague: null, leagues: twoLeagueResponse });
  addSeasonRecordMock = jest.requireMock('@/stores/leagueHistoryStore').useLeagueHistoryStore.getState().addSeasonRecord as jest.Mock;
  const { useClubStore } = jest.requireMock('@/stores/clubStore');
  useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 38 }, addTrophy: mockAddTrophy });
  const { useWorldStore } = jest.requireMock('@/stores/worldStore');
  useWorldStore.getState = () => ({
    clubs: {},
    leagues: mockWorldLeagues,
    applySeasonUpdate: mockApplySeasonUpdate,
    addTrophyToClub: mockAddTrophyToClub,
  });
});
```

Now add a new `describe` block at the bottom of the test file (after the `performSeasonTransition` describe block):

```ts
// ─── awardSeasonTrophies ──────────────────────────────────────────────────────

import { awardSeasonTrophies } from '@/engine/SeasonTransitionService';
import type { PyramidLeague } from '@/api/endpoints/season';

const ampPyramidLeague: PyramidLeague = {
  leagueId: 'L8',
  standings: [
    { clubId: 'amp1', isAmp: true,  promoted: false, relegated: false },
    { clubId: 'c12',  isAmp: false, promoted: false, relegated: true  },
  ],
};

const npcOnlyPyramidLeague: PyramidLeague = {
  leagueId: 'L7',
  standings: [
    { clubId: 'c10', isAmp: false, promoted: true,  relegated: false },
    { clubId: 'c11', isAmp: false, promoted: false, relegated: true  },
  ],
};

const ampResponseLeague: SeasonUpdateLeague = {
  id: 'L8', tier: 8, name: 'League 8', country: 'BR', promotionSpots: 1,
  reputationTier: 'local', tvDeal: 0, sponsorPot: 0, prizeMoney: 0,
  leaguePositionPot: 0, leaguePositionDecreasePercent: 0,
  clubs: [
    { clubId: 'amp1', isAmp: true, promoted: false, relegated: false },
    { clubId: 'c12',  isAmp: false, promoted: false, relegated: true },
  ],
  fixtures: [],
};

const npcResponseLeague: SeasonUpdateLeague = {
  id: 'L7', tier: 7, name: 'League 7', country: 'BR', promotionSpots: 1,
  reputationTier: 'local', tvDeal: 0, sponsorPot: 0, prizeMoney: 0,
  leaguePositionPot: 0, leaguePositionDecreasePercent: 0,
  clubs: [
    { clubId: 'c10', isAmp: false, promoted: true,  relegated: false },
    { clubId: 'c11', isAmp: false, promoted: false, relegated: true },
  ],
  fixtures: [],
};

describe('awardSeasonTrophies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useClubStore } = jest.requireMock('@/stores/clubStore');
    useClubStore.getState = () => ({ club: { id: 'amp1', weekNumber: 38 }, addTrophy: mockAddTrophy });
    const { useWorldStore } = jest.requireMock('@/stores/worldStore');
    useWorldStore.getState = () => ({
      clubs: {
        'c10': { id: 'c10', name: 'Club Ten', reputation: 30, tier: 7, primaryColor: '#aaa', secondaryColor: '#bbb', stadiumName: null, facilities: {} },
        'c11': { id: 'c11', name: 'Club Eleven', reputation: 20, tier: 7, primaryColor: '#ccc', secondaryColor: '#ddd', stadiumName: null, facilities: {} },
      },
      leagues: [],
      applySeasonUpdate: mockApplySeasonUpdate,
      addTrophyToClub: mockAddTrophyToClub,
    });
  });

  it('calls addTrophy when AMP finished 1st', () => {
    const snapshot: SeasonTransitionSnapshot = {
      ...baseSnapshot,
      finalPosition: 1,
      currentLeague: league8,
    };
    awardSeasonTrophies(snapshot, [ampPyramidLeague], [ampResponseLeague]);
    expect(mockAddTrophy).toHaveBeenCalledTimes(1);
    const trophy = mockAddTrophy.mock.calls[0][0];
    expect(trophy.type).toBe('league_title');
    expect(trophy.tier).toBe(8);
    expect(trophy.leagueName).toBe('League 8');
    expect(trophy.season).toBe(1);
    expect(trophy.wins).toBe(6);
    expect(trophy.standings).toHaveLength(3); // mockStandings has 3 entries
  });

  it('does NOT call addTrophy when AMP did not finish 1st', () => {
    const snapshot: SeasonTransitionSnapshot = {
      ...baseSnapshot,
      finalPosition: 2,
    };
    awardSeasonTrophies(snapshot, [ampPyramidLeague], [ampResponseLeague]);
    expect(mockAddTrophy).not.toHaveBeenCalled();
  });

  it('calls addTrophyToClub for NPC league winner', () => {
    awardSeasonTrophies(
      { ...baseSnapshot, finalPosition: 2 },
      [npcOnlyPyramidLeague],
      [npcResponseLeague],
    );
    expect(mockAddTrophyToClub).toHaveBeenCalledTimes(1);
    const [clubId, trophy] = mockAddTrophyToClub.mock.calls[0];
    expect(clubId).toBe('c10');
    expect(trophy.type).toBe('league_title');
    expect(trophy.tier).toBe(7);
    expect(trophy.leagueName).toBe('League 7');
  });

  it('does NOT call addTrophyToClub for the AMP league (winner is AMP)', () => {
    awardSeasonTrophies(
      { ...baseSnapshot, finalPosition: 1 },
      [ampPyramidLeague],
      [ampResponseLeague],
    );
    expect(mockAddTrophyToClub).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --testPathPattern=engine/SeasonTransitionService --no-coverage 2>&1 | tail -20`

Expected: FAIL — `awardSeasonTrophies` is not exported.

- [ ] **Step 3: Add import and implement buildRichStandings in SeasonTransitionService.ts**

In `src/engine/SeasonTransitionService.ts`, add to the existing imports (after line 18):

```ts
import type { TrophyRecord, TrophyStandingEntry } from '@/types/club';
```

Add the following private helper immediately before the `// ─── Orchestrator ───` comment (around line 386):

```ts
// ─── Trophy helpers ───────────────────────────────────────────────────────────

/**
 * Compute per-club W/D/L/pts/gd/gf/ga stats for a league by scanning fixtures.
 * Returns clubs sorted by pts → gd → gf (descending), same order as the final table.
 * Reads fixtureStore (read-only).
 */
function buildRichStandings(
  leagueId: string,
  clubIds: string[],
  season: number,
): Array<{
  clubId: string;
  pts: number; gd: number; gf: number; ga: number;
  wins: number; draws: number; losses: number; played: number;
}> {
  const fixtures = useFixtureStore.getState().fixtures;
  const stats: Record<string, {
    pts: number; gd: number; gf: number; ga: number;
    wins: number; draws: number; losses: number; played: number;
  }> = {};
  for (const id of clubIds) {
    stats[id] = { pts: 0, gd: 0, gf: 0, ga: 0, wins: 0, draws: 0, losses: 0, played: 0 };
  }
  for (const f of fixtures) {
    if (f.leagueId !== leagueId || f.season !== season || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    const h = stats[f.homeClubId];
    const a = stats[f.awayClubId];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += homeGoals; h.ga += awayGoals; h.gd += homeGoals - awayGoals;
    a.gf += awayGoals; a.ga += homeGoals; a.gd += awayGoals - homeGoals;
    if (homeGoals > awayGoals)      { h.pts += 3; h.wins++;  a.losses++; }
    else if (homeGoals < awayGoals) { a.pts += 3; a.wins++;  h.losses++; }
    else                            { h.pts += 1; a.pts += 1; h.draws++; a.draws++; }
  }
  return clubIds
    .map((id) => ({ clubId: id, ...stats[id] }))
    .sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
}

/**
 * Award league title trophies at the end of a season.
 * - AMP club: calls clubStore.addTrophy if finalPosition === 1.
 * - NPC clubs: calls worldStore.addTrophyToClub for the winner of every non-AMP league.
 * Must be called after applySeasonResponse (clubs have correct league assignments).
 */
export function awardSeasonTrophies(
  snapshot: SeasonTransitionSnapshot,
  pyramidLeagues: PyramidLeague[],
  responseLeagues: SeasonUpdateLeague[],
): void {
  const { currentSeason } = snapshot;

  // ── AMP trophy ──
  if (snapshot.finalPosition === 1) {
    const standings: TrophyStandingEntry[] = snapshot.displayStandings.map((s, i) => ({
      clubId:         s.id,
      clubName:       s.name,
      position:       i + 1,
      wins:           s.wins,
      draws:          s.draws,
      losses:         s.losses,
      points:         s.pts,
      goalDifference: s.gd,
    }));
    useClubStore.getState().addTrophy({
      type:          'league_title',
      tier:          snapshot.currentLeague.tier,
      leagueName:    snapshot.currentLeague.name,
      season:        currentSeason,
      weekCompleted: snapshot.weekNumber,
      wins:          snapshot.wins,
      draws:         snapshot.draws,
      losses:        snapshot.losses,
      points:        snapshot.points,
      goalsFor:      snapshot.goalsFor,
      goalsAgainst:  snapshot.goalsAgainst,
      standings,
    });
  }

  // ── NPC trophies ──
  const worldClubs = useWorldStore.getState().clubs;
  for (const pyLeague of pyramidLeagues) {
    const winner = pyLeague.standings[0];
    // Skip if league has no clubs, or winner is the AMP (handled above)
    if (!winner || winner.isAmp) continue;

    const responseLeague = responseLeagues.find((l) => l.id === pyLeague.leagueId);
    if (!responseLeague) continue;

    const npcClubIds = responseLeague.clubs.filter((c) => !c.isAmp).map((c) => c.clubId);
    const richStandings = buildRichStandings(pyLeague.leagueId, npcClubIds, currentSeason);

    const trophyStandings: TrophyStandingEntry[] = richStandings.map((s, i) => ({
      clubId:         s.clubId,
      clubName:       worldClubs[s.clubId]?.name ?? s.clubId,
      position:       i + 1,
      wins:           s.wins,
      draws:          s.draws,
      losses:         s.losses,
      points:         s.pts,
      goalDifference: s.gd,
    }));

    const npcWinner = richStandings[0];
    if (!npcWinner) continue;

    void useWorldStore.getState().addTrophyToClub(winner.clubId, {
      type:          'league_title',
      tier:          responseLeague.tier,
      leagueName:    responseLeague.name,
      season:        currentSeason,
      weekCompleted: snapshot.weekNumber,
      wins:          npcWinner.wins,
      draws:         npcWinner.draws,
      losses:        npcWinner.losses,
      points:        npcWinner.pts,
      goalsFor:      npcWinner.gf,
      goalsAgainst:  npcWinner.ga,
      standings:     trophyStandings,
    });
  }
}
```

- [ ] **Step 4: Call awardSeasonTrophies at end of performSeasonTransition**

In `performSeasonTransition` (around line 434), after `retireAMPPlayers(retirementConfig, snapshot.weekNumber);`, add:

```ts
  awardSeasonTrophies(snapshot, pyramidLeagues, responseLeagues);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest --testPathPattern=engine/SeasonTransitionService --no-coverage`

Expected: All tests pass, including the new `awardSeasonTrophies` describe block.

- [ ] **Step 6: Commit**

```bash
git add src/engine/SeasonTransitionService.ts src/__tests__/engine/SeasonTransitionService.test.ts
git commit -m "feat: award league title trophies to AMP and NPC clubs at season end"
```

---

## Task 5: Create Museum screen

**Files:**
- Create: `app/museum.tsx`

- [ ] **Step 1: Create app/museum.tsx**

```tsx
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useClubStore } from '@/stores/clubStore';
import type { TrophyRecord } from '@/types/club';

// ─── Trophy card ──────────────────────────────────────────────────────────────

function TrophyCard({ trophy, ampClubId }: { trophy: TrophyRecord; ampClubId: string }) {
  return (
    <View style={[{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.yellow,
      marginBottom: 12,
    }, pixelShadow]}>

      {/* Card header */}
      <View style={{
        backgroundColor: WK.tealDark,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Trophy size={12} color={WK.yellow} />
          <PixelText size={7} color={WK.yellow} numberOfLines={1} style={{ flex: 1 }}>
            {trophy.leagueName.toUpperCase()}
          </PixelText>
        </View>
        <View style={{
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: WK.border,
          backgroundColor: WK.tealCard,
          marginLeft: 8,
        }}>
          <PixelText size={6} color={WK.tealLight}>T{trophy.tier}</PixelText>
        </View>
      </View>

      {/* Stat row */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        backgroundColor: WK.yellow + '12',
      }}>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={14} variant="vt323" color={WK.yellow}>{trophy.season}</PixelText>
          <BodyText size={9} dim>SEASON</BodyText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={13} variant="vt323" color={WK.text}>
            {trophy.wins}W {trophy.draws}D {trophy.losses}L
          </PixelText>
          <BodyText size={9} dim>RECORD</BodyText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={14} variant="vt323" color={WK.tealLight}>{trophy.points}</PixelText>
          <BodyText size={9} dim>POINTS</BodyText>
        </View>
      </View>

      {/* Final standings table */}
      <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 }}>
        {/* Column headers */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4 }}>
          <BodyText size={10} dim style={{ width: 24 }}>#</BodyText>
          <BodyText size={10} dim style={{ flex: 1 }}>CLUB</BodyText>
          <BodyText size={10} dim style={{ width: 32, textAlign: 'right' }}>GD</BodyText>
          <BodyText size={10} dim style={{ width: 36, textAlign: 'right' }}>PTS</BodyText>
        </View>
        {trophy.standings.map((entry, i) => {
          const isAmp = entry.clubId === ampClubId;
          return (
            <View
              key={entry.clubId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 5,
                paddingHorizontal: 4,
                borderBottomWidth: i < trophy.standings.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
                backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
              }}
            >
              <BodyText size={12} color={isAmp ? WK.yellow : WK.dim} style={{ width: 24 }}>
                {entry.position}
              </BodyText>
              <BodyText
                size={12}
                color={isAmp ? WK.yellow : WK.text}
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {entry.clubName.toUpperCase()}
              </BodyText>
              <BodyText size={12} dim style={{ width: 32, textAlign: 'right' }}>
                {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
              </BodyText>
              <BodyText
                size={12}
                color={isAmp ? WK.yellow : WK.text}
                style={{ width: 36, textAlign: 'right' }}
              >
                {entry.points}
              </BodyText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Museum screen ────────────────────────────────────────────────────────────

export default function MuseumScreen() {
  const router    = useRouter();
  const trophies  = useClubStore((s) => s.club.trophies ?? []);
  const ampClubId = useClubStore((s) => s.club.id);
  const reversed  = [...trophies].reverse();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </TouchableOpacity>
        <Trophy size={14} color={WK.yellow} />
        <PixelText size={9} style={{ flex: 1 }}>MUSEUM</PixelText>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      >
        {reversed.length === 0 ? (
          <View style={[{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 24,
            alignItems: 'center',
          }, pixelShadow]}>
            <Trophy size={32} color={WK.dim} />
            <PixelText size={8} dim style={{ marginTop: 12, textAlign: 'center' }}>
              NO TROPHIES YET
            </PixelText>
            <BodyText size={12} dim style={{ marginTop: 8, textAlign: 'center' }}>
              Win a league title to see it displayed here.
            </BodyText>
          </View>
        ) : (
          reversed.map((trophy, i) => (
            <TrophyCard
              key={`${trophy.leagueName}-${trophy.season}-${i}`}
              trophy={trophy}
              ampClubId={ampClubId}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep museum`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/museum.tsx
git commit -m "feat: add Museum screen displaying AMP trophy cabinet"
```

---

## Task 6: Add VIEW MUSEUM button in Office > Stadium tab

**Files:**
- Modify: `app/(tabs)/office.tsx`

- [ ] **Step 1: Add TouchableOpacity to react-native import**

In `app/(tabs)/office.tsx`, update line 2 to add `TouchableOpacity`:

```ts
import { View, Modal, TextInput, ScrollView, Pressable, useWindowDimensions, TouchableOpacity } from 'react-native';
```

- [ ] **Step 2: Add lucide imports**

After the existing imports (before or after line 27 which imports `PixelFootballBadge`), add:

```ts
import { ChevronRight, Trophy } from 'lucide-react-native';
```

- [ ] **Step 3: Insert VIEW MUSEUM button in STADIUM tab**

In the STADIUM tab `ScrollView` content (around line 913), after the closing `/>` of `<StadiumView ... />` and before `{stadiumTemplates.map(...)`, insert:

```tsx
            <TouchableOpacity
              onPress={() => router.push('/museum')}
              activeOpacity={0.7}
              style={[{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.yellow,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 14,
              }, pixelShadow]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trophy size={14} color={WK.yellow} />
                <PixelText size={8} color={WK.yellow}>VIEW MUSEUM</PixelText>
              </View>
              <ChevronRight size={14} color={WK.dim} />
            </TouchableOpacity>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep office`

Expected: No errors.

- [ ] **Step 5: Run all tests to confirm nothing is broken**

Run: `npx jest --no-coverage`

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/office.tsx
git commit -m "feat: add VIEW MUSEUM navigation button in Office > Stadium tab"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] §1 Data Model — Tasks 1 covers `TrophyStandingEntry`, `TrophyRecord`, `Club.trophies`, `WorldClub.trophies`
- [x] §2 Store Changes — Tasks 2 + 3 cover `addTrophy`, `DEFAULT_CLUB.trophies`, `addTrophyToClub`; `resetAllStores.ts` confirmed needing no changes
- [x] §3 Trophy Awarding — Task 4 covers `awardSeasonTrophies` + call in `performSeasonTransition`
- [x] §4 Museum UI — Task 5 covers full screen; Task 6 covers navigation from Office > Stadium

**Placeholder scan:** No TBDs, all code blocks complete with exact field names.

**Type consistency:**
- `TrophyRecord` defined in Task 1; imported in Tasks 2, 3, 4, 5 — consistent
- `TrophyStandingEntry` defined in Task 1; used in Task 4's `awardSeasonTrophies` — consistent
- `addTrophy` defined in Task 2; called in Task 4 — consistent signature
- `addTrophyToClub` defined in Task 3; called in Task 4 and mocked in Task 4 tests — consistent signature
