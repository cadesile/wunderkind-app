# All-League Tables in Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live, standings-computed league tables for every tier in the Browse tab, with each row clicking through to club/player detail.

**Architecture:** `generateFixturesFromWorldLeague` is made optional-AMP so it can be called for all leagues at world-init time. `SimulationService.runBatchSimulation` already processes every fixture in the store by current matchday, so NPC-only leagues get simulated automatically once their fixtures are present. `computeStandings` and `LeagueTable` are widened to accept `WorldClub[]` directly (structural typing), eliminating any need for adapters. `LeagueBrowser` replaces `WorldClubList` with `LeagueTable` for every tier.

**Tech Stack:** React Native / Expo, Zustand, TypeScript, Jest (jest-expo), NativeWind

---

## File Map

| File | Change |
|------|--------|
| `src/utils/standingsCalculator.ts` | Widen `clubs` param to `{ id: string }[]`; make `ampClubId` optional |
| `src/__tests__/utils/standingsCalculator.test.ts` | Add NPC-only test (no ampClubId) |
| `src/stores/fixtureStore.ts` | Make `ampClubId` the 3rd optional param in `generateFixturesFromWorldLeague`; move it after `season` |
| `src/__tests__/stores/fixtureStore.test.ts` | Add test for NPC-only league fixture generation |
| `src/stores/worldStore.ts` | Call `generateFixturesFromWorldLeague` for every league in `setFromWorldPack`, not just the bottom one |
| `src/components/competitions/LeagueTable.tsx` | Widen `clubs` prop; make `ampClubId`/`ampName` optional |
| `src/components/competitions/LeagueBrowser.tsx` | Replace `WorldClubList` with `LeagueTable` for all leagues; filter fixtures by `leagueId` |

---

### Task 1: Widen `computeStandings` — optional `ampClubId`, generic `clubs`

**Files:**
- Modify: `src/utils/standingsCalculator.ts`
- Modify: `src/__tests__/utils/standingsCalculator.test.ts`

- [ ] **Step 1: Add a failing test for the NPC-only case**

  Open `src/__tests__/utils/standingsCalculator.test.ts` and add this test inside the `describe('computeStandings')` block (after the last existing test):

  ```ts
  it('works without an AMP club — computes standings from clubs array only', () => {
    const clubs = [makeClub('a'), makeClub('b'), makeClub('c')];
    const fixtures = [makeFixture('f1', 'a', 'b', 2, 0)];
    const rows = computeStandings(fixtures, clubs);
    expect(rows).toHaveLength(3);
    const a = rows.find((r) => r.clubId === 'a')!;
    expect(a.won).toBe(1);
    expect(a.points).toBe(3);
    const b = rows.find((r) => r.clubId === 'b')!;
    expect(b.lost).toBe(1);
    expect(b.points).toBe(0);
  });
  ```

- [ ] **Step 2: Run the test — confirm it fails**

  ```bash
  cd wunderkind-app && npx jest src/__tests__/utils/standingsCalculator.test.ts -t "works without an AMP club" --no-coverage
  ```

  Expected: FAIL — TypeScript error or runtime mismatch because `ampClubId` is currently required.

- [ ] **Step 3: Update `computeStandings` signature and body**

  Replace the entire contents of `src/utils/standingsCalculator.ts`:

  ```ts
  import type { Fixture } from '@/stores/fixtureStore';

  export interface StandingRow {
    clubId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }

  export function computeStandings(
    fixtures: Fixture[],
    clubs: { id: string }[],
    ampClubId?: string,
  ): StandingRow[] {
    const allIds = new Set<string>([
      ...(ampClubId ? [ampClubId] : []),
      ...clubs.map((c) => c.id),
    ]);

    const rows = new Map<string, StandingRow>();
    for (const id of allIds) {
      rows.set(id, {
        clubId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    for (const fixture of fixtures) {
      if (fixture.result === null) continue;
      const { homeGoals, awayGoals } = fixture.result;

      const home = rows.get(fixture.homeClubId);
      if (home) {
        home.played++;
        home.goalsFor += homeGoals;
        home.goalsAgainst += awayGoals;
        if (homeGoals > awayGoals) { home.won++; home.points += 3; }
        else if (homeGoals === awayGoals) { home.drawn++; home.points += 1; }
        else { home.lost++; }
      }

      const away = rows.get(fixture.awayClubId);
      if (away) {
        away.played++;
        away.goalsFor += awayGoals;
        away.goalsAgainst += homeGoals;
        if (awayGoals > homeGoals) { away.won++; away.points += 3; }
        else if (awayGoals === homeGoals) { away.drawn++; away.points += 1; }
        else { away.lost++; }
      }
    }

    for (const row of rows.values()) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    }

    return Array.from(rows.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.clubId.localeCompare(b.clubId);
    });
  }
  ```

- [ ] **Step 4: Run the full test file — all tests must pass**

  ```bash
  npx jest src/__tests__/utils/standingsCalculator.test.ts --no-coverage
  ```

  Expected: all 7 tests PASS (6 existing + 1 new).

- [ ] **Step 5: Commit**

  ```bash
  git add src/utils/standingsCalculator.ts src/__tests__/utils/standingsCalculator.test.ts
  git commit -m "feat: make ampClubId optional in computeStandings; widen clubs type"
  ```

---

### Task 2: Make `generateFixturesFromWorldLeague` work for NPC-only leagues

**Files:**
- Modify: `src/stores/fixtureStore.ts`
- Modify: `src/__tests__/stores/fixtureStore.test.ts`

- [ ] **Step 1: Add a failing test**

  Open `src/__tests__/stores/fixtureStore.test.ts`. Add this import at the top (after existing imports):

  ```ts
  import type { WorldLeague } from '@/types/world';
  ```

  Add a helper after `makeLeague`:

  ```ts
  function makeWorldLeague(id: string, clubIds: string[]): WorldLeague {
    return { id, tier: 1, name: `League ${id}`, country: 'EN', promotionSpots: 2, reputationTier: 'elite', clubIds };
  }
  ```

  Add these two tests inside the `describe('fixtureStore')` block (after the last existing test):

  ```ts
  it('generateFixturesFromWorldLeague without ampClubId generates fixtures for NPC clubs only', () => {
    const wl = makeWorldLeague('npc-league-1', ['npc-a', 'npc-b', 'npc-c']);
    useFixtureStore.getState().generateFixturesFromWorldLeague(wl, 1);
    const { fixtures } = useFixtureStore.getState();
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((f) => f.leagueId === 'npc-league-1')).toBe(true);
    expect(fixtures.some((f) => f.homeClubId === 'amp-id' || f.awayClubId === 'amp-id')).toBe(false);
  });

  it('generateFixturesFromWorldLeague with ampClubId includes AMP in fixtures', () => {
    const wl = makeWorldLeague('amp-league-1', ['npc-x', 'npc-y']);
    useFixtureStore.getState().generateFixturesFromWorldLeague(wl, 1, 'amp-id');
    const { fixtures } = useFixtureStore.getState();
    expect(fixtures.some((f) => f.homeClubId === 'amp-id' || f.awayClubId === 'amp-id')).toBe(true);
  });
  ```

- [ ] **Step 2: Run the new tests — confirm they fail**

  ```bash
  npx jest src/__tests__/stores/fixtureStore.test.ts -t "generateFixturesFromWorldLeague" --no-coverage
  ```

  Expected: FAIL — wrong number of arguments or TypeScript error.

- [ ] **Step 3: Update `fixtureStore.ts`**

  Open `src/stores/fixtureStore.ts`. Make two changes:

  **a) Update the `FixtureActions` interface** — change the signature (move `ampClubId` to 3rd optional param):

  ```ts
  /** Generate fixtures from a WorldLeague (used at world init when no LeagueSnapshot exists yet). */
  generateFixturesFromWorldLeague: (league: WorldLeague, season: number, ampClubId?: string) => void;
  ```

  **b) Update the implementation** — change the `generateFixturesFromWorldLeague` body:

  ```ts
  generateFixturesFromWorldLeague: (league, season, ampClubId) => {
    const { fixtures } = get();
    const alreadyGenerated = fixtures.some(
      (f) => f.leagueId === league.id && f.season === season
    );
    if (alreadyGenerated) return;

    const participants = ampClubId
      ? [ampClubId, ...league.clubIds]
      : [...league.clubIds];
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

- [ ] **Step 4: Run the full fixtureStore test file — all tests must pass**

  ```bash
  npx jest src/__tests__/stores/fixtureStore.test.ts --no-coverage
  ```

  Expected: all tests PASS (existing + 2 new).

- [ ] **Step 5: Commit**

  ```bash
  git add src/stores/fixtureStore.ts src/__tests__/stores/fixtureStore.test.ts
  git commit -m "feat: make ampClubId optional in generateFixturesFromWorldLeague"
  ```

---

### Task 3: Generate fixtures for all leagues during world init

**Files:**
- Modify: `src/stores/worldStore.ts`

  (No new tests — `worldStore.setFromWorldPack` integration is covered by the existing fixtureStore tests and the behaviour is observable in-app.)

- [ ] **Step 1: Update the existing `generateFixturesFromWorldLeague` call and add the all-leagues loop**

  Open `src/stores/worldStore.ts`. Find the block starting at `if (bottomLeague && ampClubId) {` (around line 113). The section currently ends with:

  ```ts
  useLeagueStore.getState().setFromSync(syntheticLeague);
  useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, ampClubId, 1);
  ```

  Change the `generateFixturesFromWorldLeague` call to use the new argument order, and add the loop for all other leagues **immediately after** the closing brace of the `if` block:

  ```ts
        useLeagueStore.getState().setFromSync(syntheticLeague);
        useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, 1, ampClubId);
      } else if (!bottomLeague) {
        if (ampCountry) {
          console.warn(`[WorldStore] setFromWorldPack: no league found for AMP country "${ampCountry}" — league/fixture wiring skipped`);
        } else {
          console.warn('[WorldStore] setFromWorldPack: AMP club has no country set — league/fixture wiring skipped');
        }
      }

      // Generate fixtures for every non-AMP league so Browse tables stay live
      for (const league of leagues) {
        if (league.id !== ampLeagueId) {
          useFixtureStore.getState().generateFixturesFromWorldLeague(league, 1);
        }
      }
  ```

  > **Note:** The `else if (!bottomLeague)` block already exists below the `if (bottomLeague && ampClubId)` block — do NOT duplicate it. Only add the `for` loop after the existing `else if` block.

  The full updated section should read:

  ```ts
  if (bottomLeague && ampClubId) {
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
      country:                       bottomLeague.country ?? '',
      season:                        1,
      promotionSpots:                bottomLeague.promotionSpots,
      reputationTier:                (VALID_REPUTATION_TIERS as readonly string[]).includes(bottomLeague.reputationTier ?? '')
                                       ? (bottomLeague.reputationTier as LeagueSnapshot['reputationTier'])
                                       : null,
      tvDeal:                        null,
      sponsorPot:                    0,
      prizeMoney:                    null,
      leaguePositionPot:             null,
      leaguePositionDecreasePercent: 0,
      clubs:                         clubSnapshots,
    };

    useLeagueStore.getState().setFromSync(syntheticLeague);
    useFixtureStore.getState().generateFixturesFromWorldLeague(bottomLeague, 1, ampClubId);
  } else if (!bottomLeague) {
    if (ampCountry) {
      console.warn(`[WorldStore] setFromWorldPack: no league found for AMP country "${ampCountry}" — league/fixture wiring skipped`);
    } else {
      console.warn('[WorldStore] setFromWorldPack: AMP club has no country set — league/fixture wiring skipped');
    }
  }

  // Generate fixtures for every non-AMP league so Browse tables stay live
  for (const league of leagues) {
    if (league.id !== ampLeagueId) {
      useFixtureStore.getState().generateFixturesFromWorldLeague(league, 1);
    }
  }
  ```

- [ ] **Step 2: Run all tests to confirm no regressions**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add src/stores/worldStore.ts
  git commit -m "feat: generate fixtures for all leagues at world init"
  ```

---

### Task 4: Widen `LeagueTable` props — optional AMP, generic clubs

**Files:**
- Modify: `src/components/competitions/LeagueTable.tsx`

  (No unit test — pure presentational component; visual verification in-app is sufficient.)

- [ ] **Step 1: Replace the full contents of `src/components/competitions/LeagueTable.tsx`**

  ```tsx
  import { useMemo } from 'react';
  import { View, ScrollView, Pressable } from 'react-native';
  import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
  import { WK } from '@/constants/theme';
  import { computeStandings } from '@/utils/standingsCalculator';
  import type { Fixture } from '@/stores/fixtureStore';

  const PROMOTION_GREEN = '#4CAF50';

  export interface LeagueTableProps {
    fixtures: Fixture[];
    clubs: { id: string; name: string }[];
    ampClubId?: string;
    ampName?: string;
    promotionSpots?: number | null;
    onClubPress?: (clubId: string) => void;
  }

  export function LeagueTable({ fixtures, clubs, ampClubId, ampName, promotionSpots, onClubPress }: LeagueTableProps) {
    const rows = useMemo(() => computeStandings(fixtures, clubs, ampClubId), [fixtures, clubs, ampClubId]);

    const clubNameMap = useMemo(() => {
      const map = new Map<string, string>(clubs.map((c) => [c.id, c.name]));
      if (ampClubId && ampName) map.set(ampClubId, ampName);
      return map;
    }, [clubs, ampClubId, ampName]);

    return (
      <View style={{ flex: 1 }}>
        {/* Header row */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
          backgroundColor: WK.tealDark,
        }}>
          <PixelText size={7} color={WK.dim} style={{ width: 28 }}>#</PixelText>
          <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>CLUB</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>P</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>W</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>D</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>L</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>GD</PixelText>
          <PixelText size={7} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>PTS</PixelText>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {rows.map((row, index) => {
            const pos = index + 1;
            const isAmp = !!ampClubId && row.clubId === ampClubId;
            const isPromotion = promotionSpots != null && pos <= promotionSpots;
            const name = clubNameMap.get(row.clubId) ?? row.clubId;

            return (
              <Pressable
                key={row.clubId}
                onPress={() => onClubPress?.(row.clubId)}
                disabled={!onClubPress}
                style={({ pressed }) => ({
                  opacity: onClubPress && pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    backgroundColor: isAmp ? WK.tealCard : 'transparent',
                    borderLeftWidth: isPromotion ? 3 : 0,
                    borderLeftColor: PROMOTION_GREEN,
                    borderBottomWidth: 1,
                    borderBottomColor: WK.border,
                    borderTopWidth: isAmp ? 2 : 0,
                    borderRightWidth: isAmp ? 2 : 0,
                    borderTopColor: WK.border,
                    borderRightColor: WK.border,
                  }}
                >
                  <VT323Text size={16} color={WK.dim} style={{ width: 28 }}>{pos}</VT323Text>
                  <BodyText
                    size={13}
                    style={{ flex: 1, color: isAmp ? WK.yellow : WK.text }}
                    numberOfLines={1}
                  >
                    {name}{isAmp ? ' ★' : ''}
                  </BodyText>
                  <VT323Text size={16} color={WK.text} style={{ width: 24, textAlign: 'right' }}>{row.played}</VT323Text>
                  <VT323Text size={16} color={WK.text} style={{ width: 24, textAlign: 'right' }}>{row.won}</VT323Text>
                  <VT323Text size={16} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>{row.drawn}</VT323Text>
                  <VT323Text size={16} color={WK.dim} style={{ width: 24, textAlign: 'right' }}>{row.lost}</VT323Text>
                  <VT323Text
                    size={16}
                    color={row.goalDifference >= 0 ? PROMOTION_GREEN : WK.red}
                    style={{ width: 32, textAlign: 'right' }}
                  >
                    {row.goalDifference >= 0 ? `+${row.goalDifference}` : `${row.goalDifference}`}
                  </VT323Text>
                  <VT323Text size={18} color={isAmp ? WK.yellow : WK.text} style={{ width: 32, textAlign: 'right' }}>
                    {row.points}
                  </VT323Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
  ```

- [ ] **Step 2: Run all tests — confirm no regressions**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/competitions/LeagueTable.tsx
  git commit -m "feat: widen LeagueTable props — optional ampClubId, generic clubs type"
  ```

---

### Task 5: Use `LeagueTable` for all leagues in `LeagueBrowser`

**Files:**
- Modify: `src/components/competitions/LeagueBrowser.tsx`

- [ ] **Step 1: Replace the full contents of `src/components/competitions/LeagueBrowser.tsx`**

  ```tsx
  import { useState } from 'react';
  import { View, ScrollView, Pressable } from 'react-native';
  import { useRouter } from 'expo-router';
  import { ChevronDown, ChevronRight } from 'lucide-react-native';
  import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
  import { WK, pixelShadow } from '@/constants/theme';
  import { LeagueTable } from './LeagueTable';
  import type { LeagueSnapshot } from '@/types/api';
  import type { Fixture } from '@/stores/fixtureStore';
  import type { WorldLeague, WorldClub } from '@/types/world';

  export interface LeagueBrowserProps {
    league: LeagueSnapshot | null;
    fixtures: Fixture[];
    ampClubId: string;
    ampName: string;
    worldLeagues: WorldLeague[];
    worldClubs: Record<string, WorldClub>;
  }

  export function LeagueBrowser({
    league,
    fixtures,
    ampClubId,
    ampName,
    worldLeagues,
    worldClubs,
  }: LeagueBrowserProps) {
    const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);
    const router = useRouter();

    if (league === null) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <PixelText size={9} color={WK.dim}>NO LEAGUE DATA</PixelText>
          <BodyText size={13} dim style={{ textAlign: 'center', lineHeight: 20 }}>
            Sync to load your national league pyramid.
          </BodyText>
        </View>
      );
    }

    // Full pyramid sorted by tier (T1 first).
    // Falls back to the single AMP league if worldStore hasn't loaded yet.
    const displayLeagues: WorldLeague[] = worldLeagues.length > 0
      ? [...worldLeagues].sort((a, b) => a.tier - b.tier)
      : [{
          id:             league.id,
          tier:           league.tier,
          name:           league.name,
          country:        league.country ?? '',
          promotionSpots: league.promotionSpots,
          reputationTier: null,
          clubIds:        [],
        }];

    const toggleLeague = (id: string) => {
      setExpandedLeagueId((prev) => (prev === id ? null : id));
    };

    const handleClubPress = (clubId: string) => {
      if (clubId === ampClubId) {
        router.push('/(tabs)/squad');
      } else {
        router.push(`/club/${clubId}`);
      }
    };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {displayLeagues.map((lg) => {
          const isExpanded  = expandedLeagueId === lg.id;
          const isAmpLeague = lg.id === league.id;

          const npcClubs: WorldClub[] = lg.clubIds
            .map((id) => worldClubs[id])
            .filter((c): c is WorldClub => c !== undefined);

          const clubCount = isAmpLeague ? league.clubs.length : npcClubs.length;

          // Filter fixtures to this league only
          const leagueFixtures = fixtures.filter((f) => f.leagueId === lg.id);

          return (
            <View key={lg.id} style={{ marginBottom: 4 }}>
              <Pressable
                onPress={() => toggleLeague(lg.id)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: WK.tealCard,
                    borderWidth: 2,
                    borderColor: isAmpLeague ? WK.yellow : WK.border,
                    gap: 10,
                  },
                  isAmpLeague && pixelShadow,
                ]}
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
                  <VT323Text size={16} color={WK.yellow}>T{lg.tier}</VT323Text>
                </View>

                <View style={{ flex: 1 }}>
                  <PixelText size={9} color={isAmpLeague ? WK.yellow : WK.text} numberOfLines={1}>
                    {lg.name}
                  </PixelText>
                  <BodyText size={12} dim style={{ marginTop: 2 }}>
                    {clubCount} clubs
                  </BodyText>
                </View>

                {isAmpLeague && (
                  <View style={{
                    backgroundColor: WK.yellow,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <PixelText size={7} color={WK.greenDark}>YOUR LEAGUE</PixelText>
                  </View>
                )}

                {isExpanded
                  ? <ChevronDown size={16} color={WK.dim} />
                  : <ChevronRight size={16} color={WK.dim} />
                }
              </Pressable>

              {isExpanded && (
                <View style={{
                  borderWidth: 2,
                  borderTopWidth: 0,
                  borderColor: isAmpLeague ? WK.yellow : WK.border,
                  minHeight: 200,
                }}>
                  {isAmpLeague ? (
                    <LeagueTable
                      fixtures={leagueFixtures}
                      clubs={league.clubs}
                      ampClubId={ampClubId}
                      ampName={ampName}
                      promotionSpots={league.promotionSpots}
                      onClubPress={handleClubPress}
                    />
                  ) : (
                    <LeagueTable
                      fixtures={leagueFixtures}
                      clubs={npcClubs}
                      promotionSpots={lg.promotionSpots}
                      onClubPress={handleClubPress}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }
  ```

- [ ] **Step 2: Run all tests — confirm no regressions**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/competitions/LeagueBrowser.tsx
  git commit -m "feat: show live league tables for all tiers in Browse"
  ```

---

## Verification

After all tasks are complete, test end-to-end in Expo Go:

1. Start a new game (or use an existing initialized save).
2. Go to **Competitions → BROWSE**.
3. Expand any non-AMP tier — should show a `#/CLUB/P/W/D/L/GD/PTS` table (all zeros on week 1, accumulating after each Advance).
4. Expand the AMP's tier — should show the same table with the AMP club highlighted in yellow with `★`.
5. Tap any club row — should navigate to `/club/[id]` (or squad page for the AMP's club).
6. Advance the week. Re-open Browse — standings for all leagues should update.
