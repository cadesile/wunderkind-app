import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useLeagueStatsStore } from '@/stores/leagueStatsStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { hapticTap } from '@/utils/haptics';
import type { Player } from '@/types/player';

const FAB_CLEARANCE = 80;

export type PerfSortKey = 'name' | 'games' | 'goals' | 'assists' | 'avgRating';

type PlayerStats = {
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
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const router = useRouter();

  const [sortKey, setSortKey] = useState<PerfSortKey>('goals');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const activePlayers = useMemo(() => allPlayers.filter((p) => p.isActive), [allPlayers]);

  const fixtures = useFixtureStore((s) => s.fixtures);
  const currentSeasonNumber = useMemo(() => {
    if (fixtures.length === 0) return 1;
    return Math.max(...fixtures.map((f) => f.season));
  }, [fixtures]);

  const seasonStartWeek = (currentSeasonNumber - 1) * 38 + 1; // Used for development snapshots

  const lsRecords = useLeagueStatsStore((s) => s.records);

  const playerStats = useMemo((): PlayerStats[] => {
    return activePlayers.map((player) => {
      // Season stats from leagueStatsStore (all clubs/leagues this season)
      const seasonRecords = Object.values(lsRecords).filter(
        (r) => r.playerId === player.id && r.season === currentSeasonNumber,
      );
      const games = seasonRecords.reduce((s, r) => s + r.appearances, 0);
      const goals = seasonRecords.reduce((s, r) => s + r.goals, 0);
      const assists = seasonRecords.reduce((s, r) => s + r.assists, 0);
      const avgRating = games > 0
        ? seasonRecords.reduce((s, r) => s + r.averageRating * r.appearances, 0) / games
        : 0;

      // All-time stats from leagueStatsStore
      const allTimeRecords = Object.values(lsRecords).filter((r) => r.playerId === player.id);
      const allTimeGoals = allTimeRecords.reduce((s, r) => s + r.goals, 0);
      const allTimeAssists = allTimeRecords.reduce((s, r) => s + r.assists, 0);

      const log = player.developmentLog ?? [];
      const startSnapshot = log.find((snap) => snap.weekNumber >= seasonStartWeek);
      const startOvr = startSnapshot?.overallRating ?? player.overallRating;
      const improvement = player.overallRating - startOvr;

      return { player, games, goals, assists, avgRating, allTimeGoals, allTimeAssists, startOvr, currentOvr: player.overallRating, improvement };
    });
  }, [activePlayers, lsRecords, currentSeasonNumber, seasonStartWeek]);

  const topScorerSeason    = useMemo(() => [...playerStats].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals)[0] ?? null, [playerStats]);
  const topScorerAllTime   = useMemo(() => [...playerStats].filter((s) => s.allTimeGoals > 0).sort((a, b) => b.allTimeGoals - a.allTimeGoals)[0] ?? null, [playerStats]);
  const assistMakerSeason  = useMemo(() => [...playerStats].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists)[0] ?? null, [playerStats]);
  const assistMakerAllTime = useMemo(() => [...playerStats].filter((s) => s.allTimeAssists > 0).sort((a, b) => b.allTimeAssists - a.allTimeAssists)[0] ?? null, [playerStats]);
  const seasonPerformers   = useMemo(() => playerStats.filter((s) => s.games > 0), [playerStats]);
  const totalImprovement   = useMemo(() => playerStats.reduce((sum, s) => sum + Math.max(0, s.improvement), 0), [playerStats]);
  const mostImproved       = useMemo(() => [...playerStats].filter((s) => s.improvement > 0).sort((a, b) => b.improvement - a.improvement)[0] ?? null, [playerStats]);

  const sortedPerformers = useMemo(() => {
    return [...seasonPerformers].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortKey === 'name')      { av = a.player.name; bv = b.player.name; }
      else if (sortKey === 'games')     { av = a.games;     bv = b.games; }
      else if (sortKey === 'goals')     { av = a.goals;     bv = b.goals; }
      else if (sortKey === 'assists')   { av = a.assists;   bv = b.assists; }
      else if (sortKey === 'avgRating') { av = a.avgRating; bv = b.avgRating; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });
  }, [seasonPerformers, sortKey, sortDir]);

  function handleSort(key: PerfSortKey) {
    hapticTap();
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

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

  function SortHeader({ label, col, flex, width }: { label: string; col: PerfSortKey; flex?: number; width?: number }) {
    const active = sortKey === col;
    const arrow = sortDir === 'desc' ? ' v' : ' ^';
    return (
      <Pressable
        onPress={() => handleSort(col)}
        hitSlop={8}
        style={[
          { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
          flex != null ? { flex, minWidth: 0 } : { width, flexShrink: 0 },
        ]}
      >
        <PixelText size={6} color={active ? WK.yellow : WK.dim} numberOfLines={1}>
          {label}{active ? arrow : ''}
        </PixelText>
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
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>SEASON PERFORMANCE</PixelText>
        <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: WK.border, marginBottom: 4, alignItems: 'center' }}>
          <SortHeader label="NAME" col="name" flex={2.5} />
          <View style={{ width: 22, justifyContent: 'center', alignItems: 'center', paddingVertical: 6, flexShrink: 0 }}>
            <PixelText size={6} color={WK.dim}>NAT</PixelText>
          </View>
          <SortHeader label="GP"  col="games"     width={28} />
          <SortHeader label="G"   col="goals"     width={24} />
          <SortHeader label="A"   col="assists"   width={24} />
          <SortHeader label="RTG" col="avgRating" width={36} />
        </View>

        {sortedPerformers.length === 0 ? (
          <BodyText size={11} dim style={{ textAlign: 'center', marginTop: 16 }}>
            NO MATCH DATA — PLAY A FIXTURE
          </BodyText>
        ) : (
          sortedPerformers.map((s) => (
            <Pressable
              key={s.player.id}
              onPress={() => { hapticTap(); router.push(`/player/${s.player.id}`); }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 7,
                borderBottomWidth: 1,
                borderBottomColor: WK.border + '44',
                backgroundColor: pressed ? WK.tealDark : 'transparent',
              })}
            >
              <BodyText size={12} upper numberOfLines={1} style={{ flex: 2.5, minWidth: 0 }}>{shortName(s.player.name)}</BodyText>
              <View style={{ width: 22, alignItems: 'center', flexShrink: 0 }}>
                <FlagText nationality={s.player.nationality} size={12} />
              </View>
              <PixelText size={7} style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>{s.games}</PixelText>
              <PixelText size={7} color={s.goals > 0 ? WK.yellow : WK.dim} style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>{s.goals}</PixelText>
              <PixelText size={7} color={s.assists > 0 ? WK.tealLight : WK.dim} style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>{s.assists}</PixelText>
              <PixelText size={7} color={WK.text} style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>{s.avgRating > 0 ? s.avgRating.toFixed(1) : '—'}</PixelText>
            </Pressable>
          ))
        )}
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
