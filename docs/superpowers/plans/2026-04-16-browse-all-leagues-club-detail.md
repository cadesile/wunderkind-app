# Browse: All Leagues + Club Detail Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the full national league pyramid in the BROWSE tab and let the user tap any club to see its player roster on a new club detail screen.

**Architecture:** All data is already on-device in `worldStore` (leagues + clubs with full rosters). `LeagueBrowser` is updated to read from `worldStore.leagues` sorted by tier; the AMP league expands to the existing standings table (rows made tappable); other leagues expand to a new `WorldClubList` component. All club taps are routed in `LeagueBrowser.handleClubPress`: AMP club → `/(tabs)/squad`, NPC club → `/club/[id]`. A new `app/club/[id].tsx` screen reads the club from `worldStore` and renders a simple player roster.

**Tech Stack:** React Native, Expo Router (`useRouter`, `useLocalSearchParams`), Zustand (`worldStore`), `WK` theme constants, `pixelShadow`, Lucide icons, `SafeAreaView`, `PixelText` / `VT323Text` / `BodyText`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/competitions/WorldClubList.tsx` | Tappable club list for NPC leagues |
| Modify | `src/components/competitions/LeagueTable.tsx` | Add optional `onClubPress` prop; wrap rows in Pressable |
| Modify | `src/components/competitions/LeagueBrowser.tsx` | Render full pyramid; route club taps |
| Modify | `app/(tabs)/competitions.tsx` | Pass `worldLeagues` + `worldClubs` to `LeagueBrowser` |
| Create | `app/club/[id].tsx` | Club detail screen with player roster |

---

## Task 1 — Create `WorldClubList` component

**Files:**
- Create: `src/components/competitions/WorldClubList.tsx`

- [ ] **Step 1: Create the file with this exact content**

```tsx
import { View, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { BodyText, VT323Text } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import type { WorldClub } from '@/types/world';

export interface WorldClubListProps {
  clubs: WorldClub[];
  onClubPress: (clubId: string) => void;
}

export function WorldClubList({ clubs, onClubPress }: WorldClubListProps) {
  const sorted = [...clubs].sort((a, b) => b.reputation - a.reputation);

  if (sorted.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <BodyText size={13} dim>No clubs loaded.</BodyText>
      </View>
    );
  }

  return (
    <View>
      {sorted.map((club) => (
        <Pressable
          key={club.id}
          onPress={() => onClubPress(club.id)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 11,
            backgroundColor: pressed ? WK.tealDark : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: WK.border,
            gap: 10,
          })}
        >
          {/* Primary colour swatch */}
          <View style={{
            width: 12,
            height: 12,
            backgroundColor: club.primaryColor,
            borderWidth: 1,
            borderColor: WK.border,
          }} />

          <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
            {club.name}
          </BodyText>

          <VT323Text size={16} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>
            {club.reputation}
          </VT323Text>

          <ChevronRight size={14} color={WK.dim} />
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
npx tsc --noEmit
```

Expected: no new errors (pre-existing warnings are fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/WorldClubList.tsx
git commit -m "feat: add WorldClubList component for NPC league browsing"
```

---

## Task 2 — Add `onClubPress` to `LeagueTable`

**Files:**
- Modify: `src/components/competitions/LeagueTable.tsx`

- [ ] **Step 1: Add the `onClubPress` prop to the interface and import `Pressable`**

Replace the top of the file (imports + interface + function signature):

```tsx
import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import { computeStandings } from '@/utils/standingsCalculator';
import type { Fixture } from '@/stores/fixtureStore';
import type { ClubSnapshot } from '@/types/api';

const PROMOTION_GREEN = '#4CAF50';

export interface LeagueTableProps {
  fixtures: Fixture[];
  clubs: ClubSnapshot[];
  ampClubId: string;
  ampName: string;
  promotionSpots?: number | null;
  onClubPress?: (clubId: string) => void;
}

export function LeagueTable({ fixtures, clubs, ampClubId, ampName, promotionSpots, onClubPress }: LeagueTableProps) {
```

- [ ] **Step 2: Wrap each standings row in a `Pressable`**

Inside the `rows.map(...)` block, replace the outer `<View key={row.clubId} style={...}>` with a `Pressable` wrapper. The inner content and its existing `View` stays unchanged:

```tsx
        {rows.map((row, index) => {
          const pos = index + 1;
          const isAmp = row.clubId === ampClubId;
          const isPromotion = promotionSpots != null && pos <= promotionSpots;
          const name = clubNameMap.get(row.clubId) ?? row.clubId;

          return (
            <Pressable
              key={row.clubId}
              onPress={() => onClubPress?.(row.clubId)}
              disabled={!onClubPress}
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
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors. The LEAGUE tab still renders `LeagueTable` without `onClubPress` — it should be no-op (rows `disabled`).

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/LeagueTable.tsx
git commit -m "feat: add onClubPress prop to LeagueTable rows"
```

---

## Task 3 — Update `LeagueBrowser` to render the full pyramid

**Files:**
- Modify: `src/components/competitions/LeagueBrowser.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { LeagueTable } from './LeagueTable';
import { WorldClubList } from './WorldClubList';
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
        country:        '',
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
                    fixtures={fixtures}
                    clubs={league.clubs}
                    ampClubId={ampClubId}
                    ampName={ampName}
                    promotionSpots={league.promotionSpots}
                    onClubPress={handleClubPress}
                  />
                ) : (
                  <WorldClubList
                    clubs={npcClubs}
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

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors. The `competitions.tsx` will show a TS error for the new required props — that's expected and fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/LeagueBrowser.tsx
git commit -m "feat: LeagueBrowser shows full league pyramid with club navigation"
```

---

## Task 4 — Update `competitions.tsx` to pass world data

**Files:**
- Modify: `app/(tabs)/competitions.tsx`

- [ ] **Step 1: Add the `useWorldStore` import**

After the existing store imports, add:

```tsx
import { useWorldStore } from '@/stores/worldStore';
```

- [ ] **Step 2: Read world data inside `CompetitionsScreen`**

Inside `CompetitionsScreen`, after the existing store reads, add:

```tsx
  const worldLeagues = useWorldStore((s) => s.leagues);
  const worldClubs   = useWorldStore((s) => s.clubs);
```

- [ ] **Step 3: Pass the new props to `LeagueBrowser`**

Replace the existing `<LeagueBrowser .../>` call:

```tsx
      {activeTab === 'BROWSE' && (
        <LeagueBrowser
          league={league}
          fixtures={fixtures}
          ampClubId={ampClubId}
          ampName={ampName}
          worldLeagues={worldLeagues}
          worldClubs={worldClubs}
        />
      )}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/competitions.tsx
git commit -m "feat: pass world store data to LeagueBrowser for full pyramid"
```

---

## Task 5 — Create `app/club/[id].tsx` detail screen

**Files:**
- Create: `app/club/[id].tsx`

Expo Router automatically registers this as a Stack screen (the root `_layout.tsx` already has `<Stack screenOptions={{ headerShown: false }} />`).

- [ ] **Step 1: Create the file with this exact content**

```tsx
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useWorldStore } from '@/stores/worldStore';
import type { WorldPlayer } from '@/types/world';

function calcOvr(p: WorldPlayer): number {
  return Math.round((p.pace + p.technical + p.vision + p.power + p.stamina + p.heart) / 6);
}

const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const club    = useWorldStore((s) => s.clubs[id]);

  if (!club) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} color={WK.dim}>CLUB NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const players = [...club.players].sort((a, b) => {
    const posDiff = (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9);
    if (posDiff !== 0) return posDiff;
    return calcOvr(b) - calcOvr(a);
  });

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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: WK.border,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}>
          <VT323Text size={14} color={WK.yellow}>T{club.tier}</VT323Text>
        </View>
        <PixelText size={9} style={{ flex: 1 }} numberOfLines={1}>{club.name}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}>

        {/* Club info card */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }, pixelShadow]}>
          {/* Colour swatches */}
          <View style={{ width: 20, height: 20, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ width: 20, height: 20, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1 }}>
            {club.stadiumName ? (
              <BodyText size={12} dim numberOfLines={1}>{club.stadiumName}</BodyText>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <PixelText size={6} dim>REP</PixelText>
            <VT323Text size={22} color={WK.yellow}>{club.reputation}</VT323Text>
          </View>
        </View>

        {/* Players roster card */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
        }, pixelShadow]}>
          {/* Column headers */}
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={7} color={WK.dim} style={{ flex: 1 }}>
              PLAYERS ({players.length})
            </PixelText>
            <PixelText size={7} color={WK.dim} style={{ width: 40, textAlign: 'center' }}>POS</PixelText>
            <PixelText size={7} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>OVR</PixelText>
          </View>

          {players.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderBottomWidth: i < players.length - 1 ? 1 : 0,
                borderBottomColor: WK.border,
              }}
            >
              <BodyText size={13} style={{ flex: 1, color: WK.text }} numberOfLines={1}>
                {p.firstName[0]}. {p.lastName}
              </BodyText>
              <View style={{
                backgroundColor: WK.tealDark,
                borderWidth: 1,
                borderColor: WK.border,
                paddingHorizontal: 4,
                paddingVertical: 1,
                width: 40,
                alignItems: 'center',
              }}>
                <PixelText size={6} color={WK.tealLight}>{p.position}</PixelText>
              </View>
              <VT323Text size={18} color={WK.yellow} style={{ width: 36, textAlign: 'right' }}>
                {calcOvr(p)}
              </VT323Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify on simulator**

```bash
npx expo start --ios
```

Check:
- BROWSE tab shows all leagues sorted T1 → T8 (not just the user's league)
- YOUR LEAGUE badge appears on the correct entry
- Expanding another league shows a club list with colour swatches, names, and reputation
- Tapping an NPC club navigates to the club detail screen showing the player roster
- Tapping the user's club in the standings navigates to the SQUAD tab
- Back button on the club detail screen returns to BROWSE

- [ ] **Step 4: Commit**

```bash
git add app/club/[id].tsx
git commit -m "feat: add club detail screen with player roster"
```
