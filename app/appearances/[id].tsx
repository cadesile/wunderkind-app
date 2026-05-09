import { useMemo, useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { useClubStore } from '@/stores/clubStore';
import { loadPlayerAppearances } from '@/utils/appearanceStorage';
import type { PlayerAppearances } from '@/types/player';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SeasonRow = {
  season: string;
  seasonNum: number;
  apps: number;
  avgRating: number;
  winPct: number;
  goals: number;
  assists: number;
};

type ClubGroup = {
  clubId: string;
  clubName: string;
  rows: SeasonRow[];
  totals: Omit<SeasonRow, 'season' | 'seasonNum'>;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** "Season 3" → 3, fallback to alphabetic index */
function seasonToNum(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function buildGroups(
  appearances: PlayerAppearances,
  clubNameFor: (id: string) => string,
): ClubGroup[] {
  // Collect all (clubId, season) pairs
  const clubSeasonMap = new Map<string, Map<string, SeasonRow>>();

  for (const [season, clubMap] of Object.entries(appearances)) {
    for (const [clubId, apps] of Object.entries(clubMap)) {
      if (apps.length === 0) continue;
      if (!clubSeasonMap.has(clubId)) clubSeasonMap.set(clubId, new Map());
      const seasonMap = clubSeasonMap.get(clubId)!;

      let rating = 0;
      let wins = 0;
      let goals = 0;
      let assists = 0;
      for (const a of apps) {
        rating  += a.rating;
        goals   += a.goals   ?? 0;
        assists += a.assists  ?? 0;
        if (a.result === 'win') wins++;
      }
      seasonMap.set(season, {
        season,
        seasonNum: seasonToNum(season),
        apps:      apps.length,
        avgRating: rating / apps.length,
        winPct:    Math.round((wins / apps.length) * 100),
        goals,
        assists,
      });
    }
  }

  const groups: ClubGroup[] = [];
  for (const [clubId, seasonMap] of clubSeasonMap.entries()) {
    const rows = [...seasonMap.values()].sort((a, b) => a.seasonNum - b.seasonNum);
    const totalApps    = rows.reduce((s, r) => s + r.apps, 0);
    const totalRating  = rows.reduce((s, r) => s + r.avgRating * r.apps, 0);
    const totalGoals   = rows.reduce((s, r) => s + r.goals, 0);
    const totalAssists = rows.reduce((s, r) => s + r.assists, 0);
    const totalWinPct  = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.winPct * r.apps, 0) / totalApps)
      : 0;
    groups.push({
      clubId,
      clubName: clubNameFor(clubId),
      rows,
      totals: {
        apps:      totalApps,
        avgRating: totalApps > 0 ? totalRating / totalApps : 0,
        winPct:    totalWinPct,
        goals:     totalGoals,
        assists:   totalAssists,
      },
    });
  }

  // Most recent season first (by latest season in the group)
  return groups.sort((a, b) => {
    const aMax = Math.max(...a.rows.map((r) => r.seasonNum));
    const bMax = Math.max(...b.rows.map((r) => r.seasonNum));
    return bMax - aMax;
  });
}

// ─── Table row ─────────────────────────────────────────────────────────────────

const COL_WIDTHS = { season: 72, apps: 36, avg: 44, win: 44, goals: 36, assists: 40 };

function TableHeader() {
  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: WK.tealDark,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.season }}>SEASON</PixelText>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.apps, textAlign: 'right' }}>APP</PixelText>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.avg, textAlign: 'right' }}>AVG</PixelText>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.win, textAlign: 'right' }}>WIN%</PixelText>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.goals, textAlign: 'right' }}>GLS</PixelText>
      <PixelText size={6} color={WK.dim} style={{ width: COL_WIDTHS.assists, textAlign: 'right' }}>AST</PixelText>
    </View>
  );
}

function DataRow({ row, isLast, isTotals }: { row: SeasonRow | Omit<SeasonRow, 'season' | 'seasonNum'>; isLast: boolean; isTotals?: boolean }) {
  const label  = isTotals ? 'TOTAL' : (row as SeasonRow).season.replace(/season\s*/i, 'S').toUpperCase();
  const color  = isTotals ? WK.yellow : WK.text;

  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: WK.border,
      backgroundColor: isTotals ? 'rgba(0,0,0,0.15)' : 'transparent',
    }}>
      <VT323Text size={14} color={isTotals ? WK.yellow : WK.tealLight} style={{ width: COL_WIDTHS.season }}>
        {label}
      </VT323Text>
      <VT323Text size={14} color={color} style={{ width: COL_WIDTHS.apps, textAlign: 'right' }}>
        {row.apps}
      </VT323Text>
      <VT323Text size={14} color={color} style={{ width: COL_WIDTHS.avg, textAlign: 'right' }}>
        {row.avgRating.toFixed(1)}
      </VT323Text>
      <VT323Text size={14} color={color} style={{ width: COL_WIDTHS.win, textAlign: 'right' }}>
        {row.winPct}%
      </VT323Text>
      <VT323Text size={14} color={row.goals > 0 ? WK.green : color} style={{ width: COL_WIDTHS.goals, textAlign: 'right' }}>
        {row.goals}
      </VT323Text>
      <VT323Text size={14} color={row.assists > 0 ? WK.tealLight : color} style={{ width: COL_WIDTHS.assists, textAlign: 'right' }}>
        {row.assists}
      </VT323Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AppearancesHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const squadPlayer = useSquadStore((s) => s.players.find((p) => p.id === id));
  const worldClubs  = useWorldStore((s) => s.clubs);
  const ampClubId   = useClubStore((s) => s.club.id);
  const ampClubName = useClubStore((s) => s.club.name ?? 'Academy');

  const player = useMemo(() => {
    if (squadPlayer) return squadPlayer;
    for (const club of Object.values(worldClubs)) {
      const wp = club.players.find((p) => p.id === id);
      if (wp) return wp;
    }
    return null;
  }, [squadPlayer, worldClubs, id]);

  const playerName = useMemo(() => {
    if (!player) return 'Unknown';
    if ('name' in player) return player.name;
    return `${player.firstName} ${player.lastName}`;
  }, [player]);

  // Map clubId → display name
  const clubNameFor = useMemo(() => (clubId: string): string => {
    if (clubId === ampClubId) return ampClubName;
    return worldClubs[clubId]?.name ?? clubId;
  }, [ampClubId, ampClubName, worldClubs]);

  const [appearances, setAppearances] = useState<PlayerAppearances | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    loadPlayerAppearances(id).then(setAppearances).catch(() => setAppearances({}));
  }, [id]);

  const groups = useMemo(
    () => (appearances ? buildGroups(appearances, clubNameFor) : []),
    [appearances, clubNameFor],
  );

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
        <View style={{ flex: 1 }}>
          <PixelText size={9}>APPEARANCE HISTORY</PixelText>
          <BodyText size={11} color={WK.dim} numberOfLines={1} style={{ marginTop: 2 }}>
            {playerName}
          </BodyText>
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <PixelText size={8} color={WK.dim} style={{ textAlign: 'center' }}>NO APPEARANCES YET</PixelText>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.clubId} style={[{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
            }, pixelShadow]}>
              {/* Club header */}
              <Pressable
                onPress={() => router.push(`/club/${group.clubId}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  backgroundColor: WK.tealDark,
                  borderBottomWidth: 2,
                  borderBottomColor: WK.border,
                }}
              >
                <PixelText size={8} color={WK.yellow} numberOfLines={1}>{group.clubName}</PixelText>
                <PixelText size={7} color={WK.dim}>→</PixelText>
              </Pressable>

              <TableHeader />

              {group.rows.map((row, i) => (
                <DataRow
                  key={row.season}
                  row={row}
                  isLast={i === group.rows.length - 1 && group.rows.length === 1}
                  isTotals={false}
                />
              ))}

              {/* Totals row — only if >1 season at this club */}
              {group.rows.length > 1 && (
                <DataRow row={group.totals} isLast isTotals />
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
