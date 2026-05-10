import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { useSquadStore } from '@/stores/squadStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { SortableTable } from '@/components/ui/SortableTable';
import type { ColumnDef } from '@/components/ui/SortableTable';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticTap } from '@/utils/haptics';
import type { Player } from '@/types/player';

// ─── Squad Ability Chart ───────────────────────────────────────────────────────

const ABILITY_ATTRS = [
  { key: 'pace'      as const, label: 'PACE',    color: '#4CC9F0' },
  { key: 'technical' as const, label: 'TECH',    color: '#F5C842' },
  { key: 'vision'    as const, label: 'VISION',  color: '#A78BFA' },
  { key: 'power'     as const, label: 'POWER',   color: '#F97316' },
  { key: 'stamina'   as const, label: 'STAMINA', color: '#22C55E' },
  { key: 'heart'     as const, label: 'HEART',   color: '#EC4899' },
];

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function donutSlice(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  const os = polarToXY(cx, cy, outerR, start);
  const oe = polarToXY(cx, cy, outerR, end);
  const is = polarToXY(cx, cy, innerR, start);
  const ie = polarToXY(cx, cy, innerR, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y} Z`;
}

function SquadAbilityChart({ players }: { players: Player[] }) {
  const data = useMemo(() => {
    const sums = { pace: 0, technical: 0, vision: 0, power: 0, stamina: 0, heart: 0 };
    let n = 0;
    for (const p of players) {
      const a = p.attributes;
      if (!a) { Object.keys(sums).forEach((k) => { sums[k as keyof typeof sums] += p.overallRating; }); }
      else { sums.pace += a.pace; sums.technical += a.technical; sums.vision += a.vision; sums.power += a.power; sums.stamina += a.stamina; sums.heart += a.heart; }
      n++;
    }
    if (n === 0) return ABILITY_ATTRS.map((a) => ({ ...a, avg: 0 }));
    return ABILITY_ATTRS.map((a) => ({ ...a, avg: Math.round(sums[a.key] / n * 10) / 10 }));
  }, [players]);

  const slices = useMemo(() => {
    const total = data.reduce((s, d) => s + d.avg, 0) || 1;
    let angle = -Math.PI / 2;
    return data.map((d) => {
      const sweep = (d.avg / total) * 2 * Math.PI;
      const start = angle;
      angle += sweep;
      return { ...d, start, end: angle };
    });
  }, [data]);

  const teamOvr = useMemo(() => {
    if (data.every((d) => d.avg === 0)) return 0;
    return Math.round(data.reduce((s, d) => s + d.avg, 0) / data.length);
  }, [data]);

  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 64;
  const INNER_R = 40;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {/* Donut */}
      <Svg width={SIZE} height={SIZE}>
        <G>
          {slices.map((s) => (
            <Path
              key={s.key}
              d={donutSlice(CX, CY, OUTER_R, INNER_R, s.start, s.end)}
              fill={s.color}
              stroke={WK.border}
              strokeWidth={2}
            />
          ))}
          {/* Center label */}
          <SvgText
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            fill={WK.text}
            fontSize={16}
            fontFamily="VT323_400Regular"
          >
            {teamOvr}
          </SvgText>
          <SvgText
            x={CX}
            y={CY + 9}
            textAnchor="middle"
            fill={WK.dim}
            fontSize={9}
            fontFamily="VT323_400Regular"
          >
            AVG OVR
          </SvgText>
        </G>
      </Svg>

      {/* Legend */}
      <View style={{ flex: 1, gap: 5 }}>
        {data.map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, backgroundColor: d.color, borderWidth: 1, borderColor: WK.border }} />
            <BodyText size={11} dim style={{ width: 44 }}>{d.label}</BodyText>
            {/* Mini bar */}
            <View style={{ flex: 1, height: 6, backgroundColor: WK.tealDark, borderWidth: 1, borderColor: WK.border }}>
              <View style={{ width: `${Math.min(d.avg, 100)}%`, height: '100%', backgroundColor: d.color + 'CC' }} />
            </View>
            <PixelText size={6} style={{ width: 26, textAlign: 'right' }}>{d.avg > 0 ? d.avg.toFixed(0) : '—'}</PixelText>
          </View>
        ))}
      </View>
    </View>
  );
}

const FAB_CLEARANCE = 80;

type PlayerStats = {
  id: string;
  player: Player;
  games: number;
  goals: number;
  assists: number;
  avgRating: number;
  allTimeGoals: number;
  allTimeAssists: number;
  startOvr: number;
  currentOvr: number;
  improvement: number;
};

function calcOvr(p: Player): number {
  if (!p.attributes) return p.overallRating;
  return Math.round((p.attributes.pace + p.attributes.technical + p.attributes.vision + p.attributes.power + p.attributes.stamina + p.attributes.heart) / 6);
}

function shortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export function PerformancePane() {
  const allPlayers = useSquadStore((s) => s.players);
  const router = useRouter();
  const db = useSQLiteContext();

  const activePlayers = useMemo(() => allPlayers.filter((p) => p.isActive), [allPlayers]);

  const fixtures = useFixtureStore((s) => s.fixtures);
  const currentSeasonNumber = useMemo(() => {
    if (fixtures.length === 0) return 1;
    return Math.max(...fixtures.map((f) => f.season));
  }, [fixtures]);

  const seasonStartWeek = (currentSeasonNumber - 1) * 38 + 1; // Used for development snapshots

  // Fetch all player stats for the squad from SQLite
  const { data: allStatsRows = [] } = useQuery({
    queryKey: ['squad-all-stats'],
    queryFn: async () => {
      type StatsRow = {
        player_id: string;
        season: number;
        appearances: number;
        goals: number;
        assists: number;
        avg_rating: number;
      };
      return db.getAllAsync<StatsRow>(
        `SELECT player_id, season, SUM(appearances) as appearances,
                SUM(goals) as goals, SUM(assists) as assists, AVG(avg_rating) as avg_rating
         FROM player_season_stats GROUP BY player_id, season`,
      );
    },
  });

  const playerStats = useMemo((): PlayerStats[] => {
    return activePlayers.map((player) => {
      // Season stats from SQLite (all clubs/leagues this season)
      const seasonRows = allStatsRows.filter(
        (r) => r.player_id === player.id && r.season === currentSeasonNumber,
      );
      const games = seasonRows.reduce((s, r) => s + r.appearances, 0);
      const goals = seasonRows.reduce((s, r) => s + r.goals, 0);
      const assists = seasonRows.reduce((s, r) => s + r.assists, 0);
      const avgRating = games > 0
        ? seasonRows.reduce((s, r) => s + r.avg_rating * r.appearances, 0) / games
        : 0;

      // All-time stats from SQLite
      const allTimeRows = allStatsRows.filter((r) => r.player_id === player.id);
      const allTimeGoals = allTimeRows.reduce((s, r) => s + r.goals, 0);
      const allTimeAssists = allTimeRows.reduce((s, r) => s + r.assists, 0);

      const log = player.developmentLog ?? [];
      const startSnapshot = log.find((snap) => snap.weekNumber >= seasonStartWeek);
      const startOvr = startSnapshot?.overallRating ?? player.overallRating;
      const improvement = player.overallRating - startOvr;

      return { id: player.id, player, games, goals, assists, avgRating, allTimeGoals, allTimeAssists, startOvr, currentOvr: player.overallRating, improvement };
    });
  }, [activePlayers, allStatsRows, currentSeasonNumber, seasonStartWeek]);

  const topScorerSeason    = useMemo(() => [...playerStats].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals)[0] ?? null, [playerStats]);
  const topScorerAllTime   = useMemo(() => [...playerStats].filter((s) => s.allTimeGoals > 0).sort((a, b) => b.allTimeGoals - a.allTimeGoals)[0] ?? null, [playerStats]);
  const assistMakerSeason  = useMemo(() => [...playerStats].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists)[0] ?? null, [playerStats]);
  const assistMakerAllTime = useMemo(() => [...playerStats].filter((s) => s.allTimeAssists > 0).sort((a, b) => b.allTimeAssists - a.allTimeAssists)[0] ?? null, [playerStats]);
  const seasonPerformers   = useMemo(() => playerStats.filter((s) => s.games > 0), [playerStats]);
  const totalImprovement   = useMemo(() => playerStats.reduce((sum, s) => sum + Math.max(0, s.improvement), 0), [playerStats]);
  const mostImproved       = useMemo(() => [...playerStats].filter((s) => s.improvement > 0).sort((a, b) => b.improvement - a.improvement)[0] ?? null, [playerStats]);

  const PERF_COLS: ColumnDef<PlayerStats>[] = useMemo(() => [
    {
      key: 'name',
      label: 'NAME',
      flex: 2.5,
      sortValue: (s) => s.player.name,
      render: (s) => <BodyText size={12} upper numberOfLines={1} style={{ flex: 1 }}>{shortName(s.player.name)}</BodyText>,
    },
    {
      key: 'nationality',
      label: 'NAT',
      flex: 0.9,
      align: 'center',
      sortValue: (s) => s.player.nationality,
      render: (s) => <FlagText nationality={s.player.nationality} size={12} />,
    },
    {
      key: 'games',
      label: 'GP',
      flex: 0.7,
      align: 'center',
      sortValue: (s) => s.games,
      render: (s) => <PixelText size={7}>{s.games}</PixelText>,
    },
    {
      key: 'goals',
      label: 'G',
      flex: 0.7,
      align: 'center',
      sortValue: (s) => s.goals,
      render: (s) => <PixelText size={7} color={s.goals > 0 ? WK.yellow : WK.dim}>{s.goals}</PixelText>,
    },
    {
      key: 'assists',
      label: 'A',
      flex: 0.7,
      align: 'center',
      sortValue: (s) => s.assists,
      render: (s) => <PixelText size={7} color={s.assists > 0 ? WK.tealLight : WK.dim}>{s.assists}</PixelText>,
    },
    {
      key: 'avgRating',
      label: 'RTG',
      flex: 1,
      align: 'center',
      sortValue: (s) => s.avgRating,
      render: (s) => <PixelText size={7} color={WK.text}>{s.avgRating > 0 ? s.avgRating.toFixed(1) : '—'}</PixelText>,
    },
  ], []);

  function renderLeaderPanel(
    label: string,
    stat: PlayerStats | null,
    statBadge: string,
  ) {
    if (!stat) {
      return (
        <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 12, minHeight: 130 }}>
          <PixelText size={6} color={WK.dim} style={{ marginBottom: 10 }}>{label}</PixelText>
          <BodyText size={11} dim>—</BodyText>
        </View>
      );
    }
    return (
      <Pressable
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: pressed ? WK.tealMid : WK.tealDark,
          borderWidth: 2,
          borderColor: WK.border,
          padding: 12,
          minHeight: 130,
        })}
        onPress={() => { hapticTap(); router.push(`/player/${stat.player.id}`); }}
      >
        <PixelText size={6} color={WK.dim} style={{ marginBottom: 8 }}>{label}</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={{ backgroundColor: WK.yellow, borderWidth: 2, borderColor: WK.border, paddingHorizontal: 7, paddingVertical: 4 }}>
            <PixelText size={9} color={WK.border}>{statBadge}</PixelText>
          </View>
        </View>
        <BodyText size={15} upper numberOfLines={1} style={{ marginBottom: 10 }}>
          {stat.player.name.split(' ')[0]}
        </BodyText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar appearance={stat.player.appearance} role="PLAYER" size={32} morale={stat.player.morale ?? 70} age={stat.player.age} />
          <BodyText size={11} dim>AGE {stat.player.age}</BodyText>
          <BodyText size={12} dim>{stat.player.position}</BodyText>
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: FAB_CLEARANCE }}>
      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, marginBottom: 12, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>TOP SCORER</PixelText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {renderLeaderPanel('THIS SEASON', topScorerSeason, topScorerSeason ? `${topScorerSeason.goals} GOALS` : '— GOALS')}
          {renderLeaderPanel('ALL TIME', topScorerAllTime, topScorerAllTime ? `${topScorerAllTime.allTimeGoals} GOALS` : '— GOALS')}
        </View>
      </View>

      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, marginBottom: 12, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>ASSIST MAKER</PixelText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {renderLeaderPanel('THIS SEASON', assistMakerSeason, assistMakerSeason ? `${assistMakerSeason.assists} ASSISTS` : '— ASSISTS')}
          {renderLeaderPanel('ALL TIME', assistMakerAllTime, assistMakerAllTime ? `${assistMakerAllTime.allTimeAssists} ASSISTS` : '— ASSISTS')}
        </View>
      </View>

      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, marginBottom: 12, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 12 }}>SQUAD ABILITY</PixelText>
        <SquadAbilityChart players={activePlayers} />
      </View>

      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, marginBottom: 12, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>SEASON PERFORMANCE</PixelText>
        <SortableTable
          columns={PERF_COLS}
          data={seasonPerformers}
          defaultSortKey="goals"
          defaultSortDir="desc"
          onRowPress={(s) => { hapticTap(); router.push(`/player/${s.player.id}`); }}
          emptyMessage="NO MATCH DATA YET"
        />
      </View>

      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>SEASON DEVELOPMENT</PixelText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, marginBottom: 12 }}>
          <BodyText size={13} dim>SQUAD OVR GAINED</BodyText>
          <PixelText size={10} color={totalImprovement > 0 ? WK.green : WK.dim}>+{totalImprovement}</PixelText>
        </View>
        <PixelText size={6} color={WK.dim} style={{ marginBottom: 8 }}>MOST IMPROVED</PixelText>
        {mostImproved ? (
          <Pressable
            onPress={() => { hapticTap(); router.push(`/player/${mostImproved.player.id}`); }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? WK.tealMid : WK.tealDark,
              borderWidth: 2,
              borderColor: WK.green,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            })}
          >
            <Avatar appearance={mostImproved.player.appearance} role="PLAYER" size={40} morale={mostImproved.player.morale ?? 70} age={mostImproved.player.age} />
            <View style={{ flex: 1 }}>
              <BodyText size={13} upper numberOfLines={1}>{mostImproved.player.name}</BodyText>
              <BodyText size={11} dim style={{ marginTop: 2 }}>{mostImproved.player.position} · {mostImproved.player.nationality}</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View style={{ backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.border, paddingHorizontal: 6, paddingVertical: 3 }}>
                  <PixelText size={7} color={WK.dim}>START {mostImproved.startOvr}</PixelText>
                </View>
                <PixelText size={8} color={WK.dim}>→</PixelText>
                <View style={{ backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.green, paddingHorizontal: 6, paddingVertical: 3 }}>
                  <PixelText size={7} color={WK.green}>NOW {mostImproved.currentOvr}</PixelText>
                </View>
                <Badge label={`+${mostImproved.improvement}`} color="green" />
              </View>
            </View>
          </Pressable>
        ) : (
          <BodyText size={11} dim>No development data yet.</BodyText>
        )}
      </View>
    </ScrollView>
  );
}
