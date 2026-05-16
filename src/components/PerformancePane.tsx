import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { useSquadStore } from '@/stores/squadStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useClubStore } from '@/stores/clubStore';
import { useClubStatsStore } from '@/stores/clubStatsStore';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
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
          <SvgText x={CX} y={CY - 5} textAnchor="middle" fill={WK.text} fontSize={16} fontFamily="VT323_400Regular">
            {teamOvr}
          </SvgText>
          <SvgText x={CX} y={CY + 9} textAnchor="middle" fill={WK.dim} fontSize={9} fontFamily="VT323_400Regular">
            AVG OVR
          </SvgText>
        </G>
      </Svg>
      <View style={{ flex: 1, gap: 5 }}>
        {data.map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, backgroundColor: d.color, borderWidth: 1, borderColor: WK.border }} />
            <BodyText size={11} dim style={{ width: 44 }}>{d.label}</BodyText>
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

// ─── Club Record Bar ──────────────────────────────────────────────────────────

function ClubRecordSection({ clubId }: { clubId: string }) {
  const getClubRecord = useClubStatsStore((s) => s.getClubRecord);
  const record = getClubRecord(clubId);

  const wins    = record?.wins    ?? 0;
  const draws   = record?.draws   ?? 0;
  const losses  = record?.losses  ?? 0;
  const played  = record?.played  ?? 0;
  const gf      = record?.goalsFor      ?? 0;
  const ga      = record?.goalsAgainst  ?? 0;
  const gd      = gf - ga;
  const winPct  = played > 0 ? Math.round((wins / played) * 100) : 0;

  const wPct = played > 0 ? (wins / played) * 100 : 0;
  const dPct = played > 0 ? (draws / played) * 100 : 0;
  const lPct = played > 0 ? (losses / played) * 100 : 0;

  const winColor  = '#22C55E';
  const drawColor = WK.yellow;
  const lossColor = '#EF4444';

  return (
    <View style={[{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border }, pixelShadow]}>
      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <PixelText size={8} color={WK.yellow}>ALL-TIME RECORD</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PixelText size={6} color={WK.dim}>{played}P</PixelText>
          <View style={{ backgroundColor: winColor + '33', borderWidth: 2, borderColor: winColor, paddingHorizontal: 6, paddingVertical: 2 }}>
            <VT323Text size={18} color={winColor}>{winPct}%</VT323Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 14, gap: 12 }}>
        {/* W/D/L segmented bar */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', height: 18, borderWidth: 2, borderColor: WK.border, overflow: 'hidden' }}>
            {wPct > 0 && <View style={{ width: `${wPct}%`, backgroundColor: winColor }} />}
            {dPct > 0 && <View style={{ width: `${dPct}%`, backgroundColor: drawColor }} />}
            {lPct > 0 && <View style={{ width: `${lPct}%`, backgroundColor: lossColor }} />}
            {played === 0 && <View style={{ flex: 1, backgroundColor: WK.tealDark }} />}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, backgroundColor: winColor, borderWidth: 1, borderColor: WK.border }} />
              <PixelText size={7} color={winColor}>{wins}W</PixelText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, backgroundColor: drawColor, borderWidth: 1, borderColor: WK.border }} />
              <PixelText size={7} color={drawColor}>{draws}D</PixelText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, backgroundColor: lossColor, borderWidth: 1, borderColor: WK.border }} />
              <PixelText size={7} color={lossColor}>{losses}L</PixelText>
            </View>
          </View>
        </View>

        {/* Goals row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>SCORED</PixelText>
            <VT323Text size={28} color={winColor}>{gf}</VT323Text>
          </View>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>CONCEDED</PixelText>
            <VT323Text size={28} color={lossColor}>{ga}</VT323Text>
          </View>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: gd >= 0 ? winColor : lossColor, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>GOAL DIFF</PixelText>
            <VT323Text size={28} color={gd >= 0 ? winColor : lossColor}>{gd >= 0 ? `+${gd}` : gd}</VT323Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Leader card ──────────────────────────────────────────────────────────────

function LeaderCard({
  sectionTitle,
  seasonStat,
  allTimeStat,
  seasonValue,
  allTimeValue,
  unit,
  accentColor,
  onPress,
}: {
  sectionTitle: string;
  seasonStat: PlayerStats | null;
  allTimeStat: PlayerStats | null;
  seasonValue: number;
  allTimeValue: number;
  unit: string;
  accentColor: string;
  onPress: (id: string) => void;
}) {
  function SubCard({
    label,
    stat,
    value,
  }: {
    label: string;
    stat: PlayerStats | null;
    value: number;
  }) {
    return (
      <Pressable
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: pressed ? WK.tealMid : WK.tealDark,
          borderWidth: 2,
          borderColor: stat ? accentColor + '66' : WK.border,
          padding: 10,
          gap: 8,
        })}
        onPress={() => { if (stat) { hapticTap(); onPress(stat.player.id); } }}
        disabled={!stat}
      >
        <PixelText size={5} color={WK.dim}>{label}</PixelText>

        {stat ? (
          <>
            {/* Avatar + name row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar
                appearance={stat.player.appearance}
                role="PLAYER"
                size={44}
                morale={stat.player.morale ?? 70}
                age={stat.player.age}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <BodyText size={13} upper numberOfLines={1}>{stat.player.name}</BodyText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FlagText nationality={stat.player.nationality} size={11} />
                  <PixelText size={6} color={WK.dim}>{stat.player.position}</PixelText>
                  <PixelText size={6} color={WK.dim}>·{stat.player.age}</PixelText>
                </View>
              </View>
            </View>

            {/* Stat highlight */}
            <View style={{
              backgroundColor: accentColor + '22',
              borderWidth: 2,
              borderColor: accentColor,
              paddingVertical: 6,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}>
              <VT323Text size={26} color={accentColor}>{value}</VT323Text>
              <PixelText size={6} color={accentColor}>{unit}</PixelText>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <PixelText size={7} color={WK.dim}>—</PixelText>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={[{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border }, pixelShadow]}>
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}>
        <PixelText size={8} color={WK.yellow}>{sectionTitle}</PixelText>
      </View>
      <View style={{ flexDirection: 'row', gap: 0 }}>
        <View style={{ flex: 1 }}>
          <SubCard label="THIS SEASON" stat={seasonStat} value={seasonValue} />
        </View>
        <View style={{ width: 3, backgroundColor: WK.border }} />
        <View style={{ flex: 1 }}>
          <SubCard label="ALL TIME" stat={allTimeStat} value={allTimeValue} />
        </View>
      </View>
    </View>
  );
}

// ─── Development section ──────────────────────────────────────────────────────

function DevelopmentSection({ playerStats, totalImprovement, mostImproved, onPress }: {
  playerStats: PlayerStats[];
  totalImprovement: number;
  mostImproved: PlayerStats | null;
  onPress: (id: string) => void;
}) {
  const improvedCount = playerStats.filter((s) => s.improvement > 0).length;
  const declinedCount = playerStats.filter((s) => s.improvement < 0).length;

  return (
    <View style={[{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border }, pixelShadow]}>
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}>
        <PixelText size={8} color={WK.yellow}>DEVELOPMENT</PixelText>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {/* Summary stat row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>OVR GAINED</PixelText>
            <VT323Text size={28} color={totalImprovement > 0 ? '#22C55E' : WK.dim}>
              {totalImprovement > 0 ? `+${totalImprovement}` : '—'}
            </VT323Text>
          </View>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>IMPROVED</PixelText>
            <VT323Text size={28} color="#22C55E">{improvedCount}</VT323Text>
          </View>
          <View style={{ flex: 1, backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 2 }}>
            <PixelText size={5} color={WK.dim}>DECLINED</PixelText>
            <VT323Text size={28} color={declinedCount > 0 ? '#EF4444' : WK.dim}>{declinedCount}</VT323Text>
          </View>
        </View>

        {/* Most improved player */}
        <PixelText size={6} color={WK.dim}>MOST IMPROVED</PixelText>
        {mostImproved ? (
          <Pressable
            onPress={() => { hapticTap(); onPress(mostImproved.player.id); }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? WK.tealMid : WK.tealDark,
              borderWidth: 2,
              borderColor: '#22C55E66',
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            })}
          >
            <Avatar
              appearance={mostImproved.player.appearance}
              role="PLAYER"
              size={52}
              morale={mostImproved.player.morale ?? 70}
              age={mostImproved.player.age}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <BodyText size={14} upper numberOfLines={1}>{mostImproved.player.name}</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FlagText nationality={mostImproved.player.nationality} size={11} />
                <PixelText size={6} color={WK.dim}>{mostImproved.player.position}</PixelText>
                <PixelText size={6} color={WK.dim}>· AGE {mostImproved.player.age}</PixelText>
              </View>
              {/* Progress bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={{ backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.border, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <PixelText size={6} color={WK.dim}>{mostImproved.startOvr}</PixelText>
                </View>
                <View style={{ flex: 1, height: 8, backgroundColor: WK.tealCard, borderWidth: 1, borderColor: WK.border }}>
                  <View style={{ width: `${Math.min((mostImproved.improvement / 5) * 100, 100)}%`, height: '100%', backgroundColor: '#22C55E' }} />
                </View>
                <View style={{ backgroundColor: '#22C55E22', borderWidth: 2, borderColor: '#22C55E', paddingHorizontal: 5, paddingVertical: 2 }}>
                  <PixelText size={6} color="#22C55E">+{mostImproved.improvement} → {mostImproved.currentOvr}</PixelText>
                </View>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={{ backgroundColor: WK.tealDark, borderWidth: 2, borderColor: WK.border, padding: 14, alignItems: 'center' }}>
            <PixelText size={7} color={WK.dim}>NO DEVELOPMENT DATA YET</PixelText>
          </View>
        )}
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
  const allPlayers  = useSquadStore((s) => s.players);
  const club        = useClubStore((s) => s.club);
  const router      = useRouter();
  const db          = useSQLiteContext();

  const activePlayers = useMemo(() => allPlayers.filter((p) => p.isActive), [allPlayers]);

  const fixtures = useFixtureStore((s) => s.fixtures);
  const currentSeasonNumber = useMemo(() => {
    if (fixtures.length === 0) return 1;
    return Math.max(...fixtures.map((f) => f.season));
  }, [fixtures]);

  const seasonStartWeek = (currentSeasonNumber - 1) * 38 + 1;

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
      const seasonRows = allStatsRows.filter(
        (r) => r.player_id === player.id && r.season === currentSeasonNumber,
      );
      const games = seasonRows.reduce((s, r) => s + r.appearances, 0);
      const goals = seasonRows.reduce((s, r) => s + r.goals, 0);
      const assists = seasonRows.reduce((s, r) => s + r.assists, 0);
      const avgRating = games > 0
        ? seasonRows.reduce((s, r) => s + r.avg_rating * r.appearances, 0) / games
        : 0;

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

  function goToPlayer(id: string) {
    router.push(`/player/${id}`);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: FAB_CLEARANCE, gap: 12 }}>

      {/* Club record */}
      <ClubRecordSection clubId={club.id} />

      {/* Top scorer */}
      <LeaderCard
        sectionTitle="TOP SCORER"
        seasonStat={topScorerSeason}
        allTimeStat={topScorerAllTime}
        seasonValue={topScorerSeason?.goals ?? 0}
        allTimeValue={topScorerAllTime?.allTimeGoals ?? 0}
        unit="GOALS"
        accentColor={WK.yellow}
        onPress={goToPlayer}
      />

      {/* Assist maker */}
      <LeaderCard
        sectionTitle="ASSIST MAKER"
        seasonStat={assistMakerSeason}
        allTimeStat={assistMakerAllTime}
        seasonValue={assistMakerSeason?.assists ?? 0}
        allTimeValue={assistMakerAllTime?.allTimeAssists ?? 0}
        unit="ASSISTS"
        accentColor={WK.tealLight}
        onPress={goToPlayer}
      />

      {/* Squad ability */}
      <View style={[{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border }, pixelShadow]}>
        <View style={{
          backgroundColor: WK.tealMid,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}>
          <PixelText size={8} color={WK.yellow}>SQUAD ABILITY</PixelText>
        </View>
        <View style={{ padding: 14 }}>
          <SquadAbilityChart players={activePlayers} />
        </View>
      </View>

      {/* Development */}
      <DevelopmentSection
        playerStats={playerStats}
        totalImprovement={totalImprovement}
        mostImproved={mostImproved}
        onPress={goToPlayer}
      />

      {/* Season performance table */}
      <View style={[{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border }, pixelShadow]}>
        <View style={{
          backgroundColor: WK.tealMid,
          borderBottomWidth: 2,
          borderBottomColor: WK.border,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}>
          <PixelText size={8} color={WK.yellow}>SEASON PERFORMANCE</PixelText>
        </View>
        <View style={{ padding: 4 }}>
          <SortableTable
            columns={PERF_COLS}
            data={seasonPerformers}
            defaultSortKey="goals"
            defaultSortDir="desc"
            onRowPress={(s) => { hapticTap(); goToPlayer(s.player.id); }}
            emptyMessage="NO MATCH DATA YET"
          />
        </View>
      </View>

    </ScrollView>
  );
}
