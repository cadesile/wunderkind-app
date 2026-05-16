import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy, UserPlus, BarChart2, Heart, ArrowLeftRight, Building2 } from 'lucide-react-native';
import useClubMetrics from '@/hooks/useClubMetrics';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';
import { MatchResultOverlay, buildMatchResultData } from '@/components/MatchResultOverlay';
import { useMatchResult } from '@/hooks/db/useMatchResult';
import { useInFormPlayer, InFormGameStat } from '@/hooks/db/useInFormPlayer';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useSQLiteContext } from 'expo-sqlite';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { penceToPounds } from '@/utils/currency';
import { calculateStadiumCapacity } from '@/utils/stadiumCapacity';
import { getLeaderboard } from '@/api/endpoints/leaderboard';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { FanFavoriteCard } from '@/components/FanFavoriteCard';
import { PixelFootballBadge } from '@/components/ui/ClubBadge/PixelFootballBadge';
import { WK, pixelShadow } from '@/constants/theme';
import { InboxMessage } from '@/stores/inboxStore';
import type { Player, DevelopmentSnapshot } from '@/types/player';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_ORDER = ['Local', 'Regional', 'National', 'Elite'] as const;

function msgTypeColor(type: InboxMessage['type']): 'yellow' | 'green' | 'red' | 'dim' {
  switch (type) {
    case 'investor': return 'green';
    case 'sponsor':  return 'yellow';
    case 'agent':    return 'yellow';
    case 'guardian': return 'dim';
    default:         return 'dim';
  }
}

// ─── Shared card wrapper ───────────────────────────────────────────────────────

function SectionCard({ children, borderColor = WK.border }: {
  children: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor,
      marginHorizontal: 10,
      marginBottom: 10,
      padding: 14,
      ...pixelShadow,
    }}>
      {children}
    </View>
  );
}

function StatRow({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <BodyText size={12} dim>{label}</BodyText>
      <PixelText size={8} color={valueColor ?? WK.tealLight}>{value}</PixelText>
    </View>
  );
}

// ─── Squad OVR Development helpers ───────────────────────────────────────────

/**
 * Computes the aggregate OVR delta across active players for a given lookback window.
 * weeksAgo=null → all-time (oldest snapshot as baseline).
 * Only players who have a snapshot at or before the cutoff contribute to the result.
 * NOTE: Baseline data comes from DevelopmentSnapshots recorded by GameLoop every 4 weeks
 * (recordDevelopmentSnapshots). If no snapshots exist yet, returns null.
 */
function computeSquadOVRDelta(
  players: Player[],
  currentWeek: number,
  weeksAgo: number | null,
): { delta: number; count: number } | null {
  const active = players.filter((p) => p.isActive);
  if (active.length === 0) return null;

  let totalDelta = 0;
  let count = 0;

  for (const p of active) {
    const log = p.developmentLog;
    if (!log || log.length === 0) continue;

    let baseline: DevelopmentSnapshot | undefined;
    if (weeksAgo === null) {
      baseline = log.reduce((a, b) => (a.weekNumber <= b.weekNumber ? a : b));
    } else {
      const cutoff = currentWeek - weeksAgo;
      const candidates = log.filter((s) => s.weekNumber <= cutoff);
      if (candidates.length === 0) continue;
      baseline = candidates.reduce((a, b) => (a.weekNumber >= b.weekNumber ? a : b));
    }

    if (baseline !== undefined) {
      totalDelta += p.overallRating - baseline.overallRating;
      count++;
    }
  }

  return count > 0 ? { delta: totalDelta, count } : null;
}

function SquadOVRDevelopmentCard({ players, currentWeek }: { players: Player[]; currentWeek: number }) {
  const rows = [
    { label: 'ALL TIME',   result: computeSquadOVRDelta(players, currentWeek, null) },
    { label: 'LAST 12 MO', result: computeSquadOVRDelta(players, currentWeek, 52) },
    { label: 'LAST 12 WK', result: computeSquadOVRDelta(players, currentWeek, 12) },
  ];

  return (
    <View style={{ gap: 0 }}>
      {rows.map(({ label, result }, i) => {
        const isLast = i === rows.length - 1;
        const deltaStr = result
          ? `${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(1)}`
          : 'N/A';
        const deltaColor = result
          ? result.delta > 0 ? WK.green : result.delta < 0 ? WK.red : WK.dim
          : WK.dim;
        return (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: isLast ? 0 : 2,
              borderBottomColor: WK.border,
            }}
          >
            <View style={{ width: 90 }}>
              <BodyText size={11} dim>{label}</BodyText>
            </View>
            <View style={{ flex: 1 }}>
              <PixelText size={9} color={deltaColor}>{deltaStr}</PixelText>
            </View>
            <BodyText size={10} dim>
              {result ? `${result.count} plyr` : '—'}
            </BodyText>
          </View>
        );
      })}
    </View>
  );
}

// ─── Roster stacked bar ───────────────────────────────────────────────────────

function RosterStackedBar({ playerCount, coachCount }: { playerCount: number; coachCount: number }) {
  const total = playerCount + coachCount;
  if (total === 0) return null;

  return (
    <View>
      <View style={{
        flexDirection: 'row',
        height: 20,
        borderWidth: 2,
        borderColor: WK.border,
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        <View style={{ flex: playerCount, backgroundColor: WK.tealLight }} />
        {coachCount > 0 && <View style={{ flex: coachCount, backgroundColor: WK.yellow }} />}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, backgroundColor: WK.tealLight, borderWidth: 1, borderColor: WK.border }} />
          <BodyText size={11} dim>{playerCount} PLAYERS</BodyText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, backgroundColor: WK.yellow, borderWidth: 1, borderColor: WK.border }} />
          <BodyText size={11} dim>{coachCount} COACHES</BodyText>
        </View>
      </View>

      {coachCount > 0 && (
        <BodyText size={11} dim style={{ marginTop: 8, textAlign: 'center' }}>
          {Math.round(playerCount / coachCount)}:1 RATIO
        </BodyText>
      )}
    </View>
  );
}

// ─── Outcome helpers ──────────────────────────────────────────────────────────

type Outcome = 'W' | 'D' | 'L';

const OUTCOME_COLOR: Record<Outcome, string> = {
  W: '#2E7D32',
  D: '#F9A825',
  L: '#C62828',
};

function getOutcome(homeGoals: number, awayGoals: number, isHome: boolean): Outcome {
  if (homeGoals === awayGoals) return 'D';
  return isHome ? (homeGoals > awayGoals ? 'W' : 'L') : (awayGoals > homeGoals ? 'W' : 'L');
}

// ─── Row 1: Club Identity — fullwidth hero with form strip ────────────────────

function ClubIdentityCard({ ampClubId }: { ampClubId: string }) {
  const club     = useClubStore((s) => s.club);
  const { templates, levels } = useFacilityStore();
  const capacity = calculateStadiumCapacity(templates, levels);
  const fixtures = useFixtureStore((s) => s.fixtures);

  const played = fixtures
    .filter((f) => f.result !== null && (f.homeClubId === ampClubId || f.awayClubId === ampClubId))
    .sort((a, b) => new Date(b.result!.playedAt).getTime() - new Date(a.result!.playedAt).getTime());

  const form: Outcome[] = played
    .slice(0, FORM_SLOTS)
    .reverse()
    .map((f) => getOutcome(f.result!.homeGoals, f.result!.awayGoals, f.homeClubId === ampClubId));

  const slots: (Outcome | null)[] = [
    ...Array(FORM_SLOTS - form.length).fill(null),
    ...form,
  ];

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.yellow,
      marginHorizontal: 10,
      marginBottom: 10,
      overflow: 'hidden',
      ...pixelShadow,
    }}>
      {/* Badge + identity */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14 }}>
        <PixelFootballBadge
          baseShape={club.badgeShape ?? 'shield'}
          primaryColor={club.primaryColor}
          secondaryColor={club.secondaryColor}
          size={72}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <PixelText size={11} numberOfLines={2}>{club.name}</PixelText>
          <BodyText size={11} dim>{club.reputationTier.toUpperCase()}</BodyText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <BodyText size={11} dim numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
              {club.stadiumName ?? '—'}
            </BodyText>
            <VT323Text size={18} color={capacity > 0 ? WK.green : WK.dim}>
              {capacity > 0 ? capacity.toLocaleString() : '—'}
            </VT323Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ flex: 1, height: 12, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
            <View style={{ flex: 1, height: 12, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border }} />
          </View>
        </View>
      </View>

      {/* Form strip */}
      <View style={{
        borderTopWidth: 2, borderTopColor: WK.border,
        paddingHorizontal: 14, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      }}>
        <PixelText size={7} color={WK.yellow} style={{ marginRight: 6 }}>FORM</PixelText>
        {slots.map((r, i) =>
          r === null ? (
            <View key={i} style={{
              flex: 1, height: 30, alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: WK.border, backgroundColor: 'rgba(0,0,0,0.2)',
            }}>
              <PixelText size={7} color={WK.border}>·</PixelText>
            </View>
          ) : (
            <View key={i} style={{
              flex: 1, height: 30, alignItems: 'center', justifyContent: 'center',
              backgroundColor: OUTCOME_COLOR[r], borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)',
            }}>
              <PixelText size={8} color={WK.text}>{r}</PixelText>
            </View>
          )
        )}
      </View>
    </View>
  );
}

// ─── Row 1 Right: Form mini-card ─────────────────────────────────────────────

const FORM_SLOTS = 5;

function FormMiniCard({ ampClubId }: { ampClubId: string }) {
  const fixtures = useFixtureStore((s) => s.fixtures);

  const played = fixtures
    .filter((f) => f.result !== null && (f.homeClubId === ampClubId || f.awayClubId === ampClubId))
    .sort((a, b) => new Date(b.result!.playedAt).getTime() - new Date(a.result!.playedAt).getTime());

  const form: Outcome[] = played
    .slice(0, FORM_SLOTS)
    .reverse()
    .map((f) => getOutcome(f.result!.homeGoals, f.result!.awayGoals, f.homeClubId === ampClubId));

  // Pad to always show 5 slots (oldest to newest)
  const slots: (Outcome | null)[] = [
    ...Array(FORM_SLOTS - form.length).fill(null),
    ...form,
  ];

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 12,
      ...pixelShadow,
    }}>
      <PixelText size={7} color={WK.yellow} style={{ marginBottom: 10 }}>FORM</PixelText>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
        {slots.map((r, i) => (
          r === null
            ? (
              <View
                key={i}
                style={{
                  flex: 1, height: 28, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: WK.border,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                <PixelText size={7} color={WK.border}>·</PixelText>
              </View>
            )
            : (
              <View
                key={i}
                style={{
                  flex: 1, height: 28, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: OUTCOME_COLOR[r],
                  borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)',
                }}
              >
                <PixelText size={8} color={WK.text}>{r}</PixelText>
              </View>
            )
        ))}
      </View>
    </View>
  );
}

// ─── Row 1 Right: League Position ────────────────────────────────────────────

function LeaguePositionCard({ ampClubId }: { ampClubId: string }) {
  const league   = useLeagueStore((s) => s.league);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const club     = useClubStore((s) => s.club);

  if (!league) return null;

  const npcClubs = league.clubs;
  const npcIds   = npcClubs.map((c) => c.id).filter((id): id is string => !!id);
  const allIds   = [ampClubId, ...npcIds];

  type Standing = {
    id: string; name: string; primaryColor: string;
    pts: number; gd: number; gf: number; played: number;
    wins: number; draws: number; losses: number;
  };

  const map: Record<string, Standing> = {};
  for (const id of allIds) {
    const isAmp = id === ampClubId;
    const snap  = npcClubs.find((c) => c.id === id);
    map[id] = {
      id,
      name:         isAmp ? (club.name ?? '') : (snap?.name ?? id),
      primaryColor: isAmp ? (club.primaryColor ?? '#888888') : (snap?.primaryColor ?? '#888888'),
      pts: 0, gd: 0, gf: 0, played: 0, wins: 0, draws: 0, losses: 0,
    };
  }

  for (const f of fixtures.filter((f) => f.leagueId === league.id && f.result)) {
    const { homeGoals, awayGoals } = f.result!;
    const home = map[f.homeClubId];
    const away = map[f.awayClubId];
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += homeGoals; home.gd += homeGoals - awayGoals;
    away.gf += awayGoals; away.gd += awayGoals - homeGoals;
    if (homeGoals > awayGoals) {
      home.pts += 3; home.wins++; away.losses++;
    } else if (homeGoals < awayGoals) {
      away.pts += 3; away.wins++; home.losses++;
    } else {
      home.pts += 1; away.pts += 1; home.draws++; away.draws++;
    }
  }

  const sorted   = Object.values(map).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const ampIndex = sorted.findIndex((s) => s.id === ampClubId);
  if (ampIndex === -1) return null;

  const total = sorted.length;
  let start   = Math.max(0, ampIndex - 2);
  let end     = Math.min(total - 1, ampIndex + 2);
  if (end - start < 4) {
    if (start === 0) end   = Math.min(total - 1, 4);
    else             start = Math.max(0, end - 4);
  }
  const slice = sorted.slice(start, end + 1);

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <PixelText size={7} color={WK.yellow}>TABLE</PixelText>
        <BodyText size={10} dim numberOfLines={1}>{league.name.toUpperCase()}</BodyText>
      </View>

      {/* Column headers */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, marginBottom: 2 }}>
        <View style={{ width: 28 }} />
        <View style={{ flex: 1 }} />
        {(['GP', 'W', 'D', 'L', 'GD'] as const).map((col) => (
          <VT323Text key={col} size={13} color={WK.dim} style={{ width: 26, textAlign: 'center' }}>{col}</VT323Text>
        ))}
        <VT323Text size={13} color={WK.dim} style={{ width: 28, textAlign: 'right' }}>PTS</VT323Text>
      </View>

      {slice.map((entry, i) => {
        const position = start + i + 1;
        const isAmp    = entry.id === ampClubId;
        const gdStr    = entry.gd > 0 ? `+${entry.gd}` : `${entry.gd}`;
        return (
          <View
            key={entry.id}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 7,
              paddingHorizontal: isAmp ? 4 : 2,
              borderBottomWidth: i < slice.length - 1 ? 1 : 0,
              borderBottomColor: WK.border,
              backgroundColor: isAmp ? WK.yellow + '22' : 'transparent',
            }}
          >
            <PixelText size={7} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28 }}>
              #{position}
            </PixelText>
            <View style={{ width: 10, height: 10, backgroundColor: entry.primaryColor, borderWidth: 1, borderColor: WK.border, marginRight: 6 }} />
            <BodyText size={11} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
              {entry.name.toUpperCase()}
            </BodyText>
            <VT323Text size={14} color={isAmp ? WK.yellow : WK.dim} style={{ width: 26, textAlign: 'center' }}>{entry.played}</VT323Text>
            <VT323Text size={14} color={isAmp ? WK.yellow : WK.green} style={{ width: 26, textAlign: 'center' }}>{entry.wins}</VT323Text>
            <VT323Text size={14} color={isAmp ? WK.yellow : WK.dim} style={{ width: 26, textAlign: 'center' }}>{entry.draws}</VT323Text>
            <VT323Text size={14} color={isAmp ? WK.yellow : WK.red} style={{ width: 26, textAlign: 'center' }}>{entry.losses}</VT323Text>
            <VT323Text size={14} color={isAmp ? WK.yellow : (entry.gd >= 0 ? WK.tealLight : WK.red)} style={{ width: 26, textAlign: 'center' }}>{gdStr}</VT323Text>
            <VT323Text size={16} color={isAmp ? WK.yellow : WK.dim} style={{ width: 28, textAlign: 'right' }}>{entry.pts}pt</VT323Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Row 2 Left: Latest Result ────────────────────────────────────────────────

function LatestResultCard({ ampClubId, onPress }: { ampClubId: string; onPress?: () => void }) {
  const fixtures = useFixtureStore((s) => s.fixtures);
  const league   = useLeagueStore((s) => s.league);

  const played = fixtures
    .filter((f) => f.result !== null && (f.homeClubId === ampClubId || f.awayClubId === ampClubId))
    .sort((a, b) => new Date(b.result!.playedAt).getTime() - new Date(a.result!.playedAt).getTime());

  if (played.length === 0) {
    return (
      <View style={{
        flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
        padding: 14, ...pixelShadow,
      }}>
        <PixelText size={7} color={WK.yellow} style={{ marginBottom: 12 }}>LATEST RESULT</PixelText>
        <VT323Text size={38} color={WK.dim} style={{ lineHeight: 38, marginBottom: 6 }}>— – —</VT323Text>
        <BodyText size={11} dim>NO MATCHES YET</BodyText>
      </View>
    );
  }

  const latest  = played[0];
  const isHome  = latest.homeClubId === ampClubId;
  const { homeGoals, awayGoals } = latest.result!;
  const outcome = getOutcome(homeGoals, awayGoals, isHome);
  const opponentId   = isHome ? latest.awayClubId : latest.homeClubId;
  const opponentClub = league?.clubs.find((c) => c.id === opponentId);
  const opponentName = opponentClub?.name ?? 'OPPONENT';

  const card = (
    <View style={{
      flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
      padding: 14, ...pixelShadow,
    }}>
      <PixelText size={7} color={WK.yellow} style={{ marginBottom: 12 }}>LATEST RESULT</PixelText>

      {/* Outcome badge */}
      <View style={{
        width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
        backgroundColor: OUTCOME_COLOR[outcome],
        borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)',
        marginBottom: 8,
      }}>
        <PixelText size={10} color={WK.text}>{outcome}</PixelText>
      </View>

      {/* Big score */}
      <VT323Text size={38} color={WK.text} style={{ lineHeight: 38, marginBottom: 6 }}>
        {homeGoals} – {awayGoals}
      </VT323Text>

      <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 8, gap: 3 }}>
        <BodyText size={11} color={WK.tealLight}>{isHome ? 'HOME' : 'AWAY'}</BodyText>
        <BodyText size={12} dim numberOfLines={1}>vs {opponentName.toUpperCase()}</BodyText>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={{ flex: 1 }} onPress={onPress} hitSlop={4}>
        {card}
      </Pressable>
    );
  }
  return card;
}

// ─── Row 2 Right: Season stats (Top Scorer + Top Assists) ─────────────────────

function AmpSeasonStatCards({ ampClubId, players }: { ampClubId: string; players: Player[] }) {
  const fixtures = useFixtureStore((s) => s.fixtures);
  const db = useSQLiteContext();

  const currentSeasonNumber = useMemo(() => {
    if (fixtures.length === 0) return 1;
    return Math.max(...fixtures.map((f) => f.season));
  }, [fixtures]);

  type StatsRow = { player_id: string; goals: number; assists: number };
  const { data: statsRows = [] } = useQuery({
    queryKey: ['amp-season-stats', ampClubId, currentSeasonNumber],
    queryFn: () => db.getAllAsync<StatsRow>(
      `SELECT player_id, SUM(goals) as goals, SUM(assists) as assists
       FROM player_season_stats
       WHERE club_id = ? AND season = ?
       GROUP BY player_id`,
      [ampClubId, currentSeasonNumber],
    ),
  });

  const { topScorer, topGoals, topAssister, topAssists } = useMemo(() => {
    let topScorer: Player | null   = null;
    let topGoals                   = -1;
    let topAssister: Player | null = null;
    let topAssists                 = -1;

    const activePlayers = players.filter((p) => p.isActive);
    for (const row of statsRows) {
      const player = activePlayers.find((p) => p.id === row.player_id);
      if (!player) continue;
      if (row.goals   > topGoals)   { topGoals   = row.goals;   topScorer   = player; }
      if (row.assists > topAssists) { topAssists = row.assists; topAssister = player; }
    }
    return { topScorer, topGoals, topAssister, topAssists };
  }, [players, statsRows]);

  return (
    <View style={{ gap: 8 }}>
      {/* Top Scorer */}
      <View style={{
        backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
        padding: 14, ...pixelShadow,
      }}>
        <PixelText size={7} color={WK.yellow} style={{ marginBottom: 10 }}>TOP SCORER</PixelText>
        {topScorer && topGoals > 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <BodyText size={12} numberOfLines={1} style={{ flex: 1 }}>{topScorer.name}</BodyText>
              <VT323Text size={28} color={'#4CAF50'}>{topGoals}</VT323Text>
            </View>
            <BodyText size={10} dim>{topScorer.position} · GOALS THIS SEASON</BodyText>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {[0,1,2,3,4].map((i) => (
                <View key={i} style={{ flex: 1, height: 4, backgroundColor: WK.border }} />
              ))}
            </View>
            <BodyText size={10} dim>NO GOALS YET</BodyText>
          </>
        )}
      </View>

      {/* Top Assists */}
      <View style={{
        backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
        padding: 14, ...pixelShadow,
      }}>
        <PixelText size={7} color={WK.tealLight} style={{ marginBottom: 10 }}>TOP ASSISTS</PixelText>
        {topAssister && topAssists > 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <BodyText size={12} numberOfLines={1} style={{ flex: 1 }}>{topAssister.name}</BodyText>
              <VT323Text size={28} color={WK.tealLight}>{topAssists}</VT323Text>
            </View>
            <BodyText size={10} dim>{topAssister.position} · ASSISTS THIS SEASON</BodyText>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {[0,1,2,3,4].map((i) => (
                <View key={i} style={{ flex: 1, height: 4, backgroundColor: WK.border }} />
              ))}
            </View>
            <BodyText size={10} dim>NO ASSISTS YET</BodyText>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Form rating chart ────────────────────────────────────────────────────────

function ratingColor(r: number): string {
  if (r >= 8) return WK.green;
  if (r >= 6.5) return WK.yellow;
  if (r >= 5) return WK.orange;
  return WK.red;
}

function FormRatingChart({ games }: { games: InFormGameStat[] }) {
  const BAR_MAX_H = 44;
  return (
    <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 10 }}>
      <PixelText size={6} dim style={{ marginBottom: 8 }}>LAST {games.length} GAMES</PixelText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {games.map((g, i) => {
          const barH = Math.max(4, Math.round((g.rating / 10) * BAR_MAX_H));
          const color = ratingColor(g.rating);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              {/* Bar container — fixed height, bar grows from bottom */}
              <View style={{ height: BAR_MAX_H, justifyContent: 'flex-end', width: '100%' }}>
                <View style={{
                  height: barH,
                  backgroundColor: color,
                  borderWidth: 1,
                  borderColor: WK.border,
                }} />
              </View>
              {/* Rating */}
              <VT323Text size={14} color={color}>{g.rating.toFixed(1)}</VT323Text>
              {/* Goals / Assists */}
              <VT323Text size={12} color={WK.dim}>G:{g.goals}</VT323Text>
              <VT323Text size={12} color={WK.dim}>A:{g.assists}</VT323Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClubDashboard() {
  const router = useRouter();
  const {
    cashBalance,
    weeklyNetCashflow,
  } = useClubMetrics();

  const messages     = useInboxStore((s) => s.messages);
  const club         = useClubStore((s) => s.club);
  const archetypes   = useArchetypeStore((s) => s.archetypes);
  const players      = useSquadStore((s) => s.players);
  const coaches      = useCoachStore((s) => s.coaches);
  const leagueClubs  = useLeagueStore((s) => s.clubs);
  const allFixtures  = useFixtureStore((s) => s.fixtures);

  // ── Match result overlay ───────────────────────────────────────────────────
  const [overlayFixtureId, setOverlayFixtureId] = useState<string | null>(null);

  const latestPlayedFixture = useMemo(() => {
    return allFixtures
      .filter((f) => f.result !== null && (f.homeClubId === club.id || f.awayClubId === club.id))
      .sort((a, b) => new Date(b.result!.playedAt).getTime() - new Date(a.result!.playedAt).getTime())[0] ?? null;
  }, [allFixtures, club.id]);

  const dashboardClubNameMap = useMemo(() => {
    const map = new Map<string, string>(leagueClubs.map((c) => [c.id, c.name]));
    map.set(club.id, club.name);
    return map;
  }, [leagueClubs, club.id, club.name]);

  const overlayFixture = useMemo(
    () => allFixtures.find((f) => f.id === overlayFixtureId) ?? null,
    [allFixtures, overlayFixtureId],
  );

  const { data: overlayMatchResult = null } = useMatchResult(overlayFixtureId ?? '');

  const overlayData = useMemo(() => {
    if (!overlayFixture) return null;
    return buildMatchResultData(overlayFixture, club.id, club.name, dashboardClubNameMap, overlayMatchResult);
  }, [overlayFixture, club.id, club.name, dashboardClubNameMap, overlayMatchResult]);

  const { data: inFormData } = useInFormPlayer(club.id);
  const inFormPlayer = inFormData ? players.find((p) => p.id === inFormData.playerId) ?? null : null;
  const inFormArchetype = inFormPlayer ? getArchetypeForPlayer(inFormPlayer, archetypes) : null;

  const recentMessages = messages.slice(0, 3);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const { data: lbData } = useQuery({
    queryKey: ['leaderboard', 'club_reputation', 'dashboard'],
    queryFn: () => getLeaderboard('club_reputation', { page: 1, pageSize: 100 }),
    staleTime: 10 * 60 * 1000,
    retry: 0,
    // @ts-ignore – gcTime is tanstack v5
    gcTime: 10 * 60 * 1000,
  });
  const myRank     = lbData?.entries.findIndex((e) => e.clubName === club.name);
  const rankDisplay = (myRank !== undefined && myRank >= 0) ? `#${myRank + 1}` : '–';

  const activePlayers    = players.filter((p) => p.isActive);
  const latestSigning    = activePlayers.length > 0
    ? activePlayers.reduce((best, p) => (p.joinedWeek ?? 0) > (best.joinedWeek ?? 0) ? p : best)
    : null;
  const injuredPlayers  = players.filter((p) => p.injury && p.injury.weeksRemaining > 0);
  const minorCount      = injuredPlayers.filter((p) => p.injury!.severity === 'minor').length;
  const moderateCount   = injuredPlayers.filter((p) => p.injury!.severity === 'moderate').length;
  const seriousCount    = injuredPlayers.filter((p) => p.injury!.severity === 'serious').length;


  const cashPounds        = penceToPounds(cashBalance);
  const isDeficit         = weeklyNetCashflow < 0;
  const tickDeltaPounds   = penceToPounds(weeklyNetCashflow);
  const tickDeltaColor    = isDeficit ? WK.red : WK.green;
  const tickDeltaSign     = isDeficit ? '-' : '+';
  const willGoNegative    = cashBalance + weeklyNetCashflow < 0;
  const careerSalesPounds = penceToPounds(club.totalCareerEarnings);

  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (willGoNegative) {
      pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [willGoNegative]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));


  return (
    <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}>
      <PitchBackground />

      {/* ── Row 1: Club Identity — fullwidth with form ───────────────────── */}
      <ClubIdentityCard ampClubId={club.id} />

      {/* ── League Table ─────────────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <LeaguePositionCard ampClubId={club.id} />
      </View>

      {/* ── Row 2: Latest Result | Top Scorer + Top Assists ──────────────── */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: 10, gap: 10 }}>
        <LatestResultCard
          ampClubId={club.id}
          onPress={latestPlayedFixture ? () => setOverlayFixtureId(latestPlayedFixture.id) : undefined}
        />
        <View style={{ flex: 1 }}>
          <AmpSeasonStatCards ampClubId={club.id} players={players} />
        </View>
      </View>

      {/* ── Quick Links ──────────────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <PixelText size={7} dim style={{ marginBottom: 8 }}>QUICK LINKS</PixelText>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {([
            { icon: BarChart2,     label: 'PERFORMANCE', color: WK.tealLight, route: '/(tabs)/hub?tab=PERFORMANCE' },
            { icon: Heart,         label: 'FANS',        color: WK.tealLight, route: '/(tabs)/office?tab=FANS'                },
          ] as const).map(({ icon: Icon, label, color, route }) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as any)}
              style={[{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.border, paddingVertical: 14, alignItems: 'center', gap: 8 }, pixelShadow]}
            >
              <Icon size={18} color={color} />
              <PixelText size={6} color={color}>{label}</PixelText>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            { icon: ArrowLeftRight, label: 'TRANSFERS', color: WK.tealLight, route: '/transfers'                        },
            { icon: Building2,      label: 'STADIUM',   color: WK.tealLight, route: '/(tabs)/office?tab=STADIUM'  },
          ] as const).map(({ icon: Icon, label, color, route }) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as any)}
              style={[{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.border, paddingVertical: 14, alignItems: 'center', gap: 8 }, pixelShadow]}
            >
              <Icon size={18} color={color} />
              <PixelText size={6} color={color}>{label}</PixelText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Row 3: In Form ───────────────────────────────────────────────── */}
      {inFormPlayer ? (
        <Pressable onPress={() => router.push(`/player/${inFormPlayer.id}`)}>
          <SectionCard borderColor={WK.tealLight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <PixelText size={7} dim upper>In Form</PixelText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <PixelText size={6} color={WK.yellow}>AVG</PixelText>
                <PixelText size={8} color={WK.yellow}>{inFormData!.avgRating.toFixed(1)}</PixelText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <Avatar
                appearance={inFormPlayer.appearance}
                role="PLAYER"
                size={56}
                morale={inFormPlayer.morale ?? 70}
                age={inFormPlayer.age}
              />
              <View style={{ flex: 1 }}>
                <BodyText size={15} upper numberOfLines={1}>{inFormPlayer.name}</BodyText>
                <BodyText size={12} color={WK.tealLight} style={{ marginTop: 3 }}>
                  {inFormPlayer.position} · AGE {inFormPlayer.age}
                </BodyText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <FlagText nationality={inFormPlayer.nationality} size={14} />
                  <BodyText size={12} dim>{inFormPlayer.nationality}</BodyText>
                </View>
              </View>
              <Badge label={`OVR ${inFormPlayer.overallRating}`} color="yellow" />
            </View>

            {inFormArchetype && (
              <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 8, marginBottom: 10 }}>
                <View style={{
                  backgroundColor: WK.yellow, borderWidth: 2, borderColor: WK.border,
                  paddingHorizontal: 6, paddingVertical: 3,
                  alignSelf: 'flex-start', marginBottom: 6,
                }}>
                  <PixelText size={6} color={WK.border}>{inFormArchetype.name.toUpperCase()}</PixelText>
                </View>
                <BodyText size={12} dim style={{ lineHeight: 18 }}>
                  {inFormArchetype.description}
                </BodyText>
              </View>
            )}

            {inFormData!.last5.length > 0 && (
              <FormRatingChart games={inFormData!.last5} />
            )}
          </SectionCard>
        </Pressable>
      ) : (
        <SectionCard>
          <PixelText size={7} dim upper style={{ marginBottom: 6 }}>In Form</PixelText>
          <PixelText size={7} dim>No match data yet.</PixelText>
        </SectionCard>
      )}

      {/* ── Row 4: Fan Base ──────────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <FanFavoriteCard />
      </View>

      {/* ── Row 5: Latest Signing | Roster Balance ───────────────────────── */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: 10, gap: 10, alignItems: 'stretch' }}>
        {/* Latest Signing */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => latestSigning && router.push(`/player/${latestSigning.id}`)}
        >
          <View style={{
            flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
            padding: 12, gap: 6, ...pixelShadow,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <UserPlus size={12} color={WK.dim} />
              <BodyText size={10} dim>LATEST SIGNING</BodyText>
            </View>
            {latestSigning ? (
              <>
                <PixelText size={8} numberOfLines={1}>{latestSigning.name}</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <BodyText size={10} color={WK.tealLight}>{latestSigning.position}</BodyText>
                  <BodyText size={10} dim>·</BodyText>
                  <BodyText size={10} color={WK.yellow}>OVR {latestSigning.overallRating}</BodyText>
                </View>
                <BodyText size={10} dim>WK {latestSigning.joinedWeek ?? '–'}</BodyText>
              </>
            ) : (
              <BodyText size={10} dim>No signings yet</BodyText>
            )}
          </View>
        </Pressable>

        {/* Roster Balance */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push('/(tabs)/hub?tab=SQUAD')}
        >
          <View style={{
            flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
            padding: 12, ...pixelShadow,
          }}>
            <PixelText size={7} dim upper style={{ marginBottom: 12 }}>Roster Balance</PixelText>
            <RosterStackedBar
              playerCount={activePlayers.length}
              coachCount={coaches.length}
            />
          </View>
        </Pressable>
      </View>

      {/* ── Row 6: Inbox ─────────────────────────────────────────────────── */}
      <SectionCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <PixelText size={7} upper>Inbox</PixelText>
          <Pressable
            onPress={() => router.push('/inbox')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={8}
          >
            <BodyText size={12} color={WK.tealLight}>VIEW ALL</BodyText>
            <ChevronRight size={12} color={WK.tealLight} />
          </Pressable>
        </View>

        {recentMessages.length === 0 ? (
          <PixelText size={7} dim>No messages yet.</PixelText>
        ) : (
          recentMessages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border,
              }}
            >
              <View style={{
                width: 6, height: 6,
                backgroundColor: msg.isRead ? 'transparent' : WK.yellow,
                borderWidth: msg.isRead ? 0 : 1,
                borderColor: WK.yellow,
              }} />
              <View style={{ flex: 1 }}>
                <BodyText size={13} numberOfLines={1}>{msg.subject}</BodyText>
                <BodyText size={11} dim style={{ marginTop: 2 }}>WK {msg.week}</BodyText>
              </View>
              {(msg.requiresResponse && !msg.response) && (
                <Badge label="ACTION" color="yellow" />
              )}
              {msg.response === 'accepted' && (
                <Badge label="CONVINCED" color="green" />
              )}
              {msg.response === 'rejected' && (
                <Badge label="IGNORED" color="red" />
              )}
            </View>
          ))
        )}
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════
          Remaining cards (not in sketch — appended below Inbox)
          ════════════════════════════════════════════════════════════════════ */}


      {/* Financial Status */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: willGoNegative ? 6 : 10, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 12, ...pixelShadow }}>
          <BodyText size={12} dim style={{ marginBottom: 6 }}>CASH</BodyText>
          <PixelText size={10} color={cashPounds >= 0 ? WK.tealLight : WK.red} numberOfLines={1}>
            {cashPounds < 0 ? '-' : ''}£{Math.abs(cashPounds).toLocaleString()}
          </PixelText>
          <BodyText size={11} color={tickDeltaColor} style={{ marginTop: 5 }}>
            {tickDeltaSign}£{Math.abs(tickDeltaPounds).toLocaleString()} NEXT TICK
          </BodyText>
        </View>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push('/transfers?filter=out')}
        >
          <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 12, ...pixelShadow }}>
            <BodyText size={12} dim style={{ marginBottom: 6 }}>SALES</BodyText>
            <PixelText size={10} color={WK.green} numberOfLines={1}>
              £{careerSalesPounds.toLocaleString()}
            </PixelText>
            <BodyText size={11} dim style={{ marginTop: 5 }}>CAREER TOTAL</BodyText>
          </View>
        </Pressable>
      </View>

      {/* Negative balance warning */}
      {willGoNegative && (
        <Animated.View style={[
          {
            marginHorizontal: 10, marginBottom: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2, borderColor: WK.red,
            paddingHorizontal: 12, paddingVertical: 8,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          },
          pulseStyle,
        ]}>
          <View style={{ width: 6, height: 6, backgroundColor: WK.red, flexShrink: 0 }} />
          <BodyText size={13} color={WK.red}>
            BALANCE WILL BE NEGATIVE AFTER NEXT TICK
          </BodyText>
        </Animated.View>
      )}

      {/* Leaderboard Position */}
      <Pressable
        onPress={() => router.push('/(tabs)/competitions?tab=RANKINGS')}
        style={{ marginHorizontal: 10, marginBottom: 10 }}
      >
        <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 12, gap: 6, ...pixelShadow }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Trophy size={12} color={WK.dim} />
            <BodyText size={10} dim>LEADERBOARD</BodyText>
          </View>
          <PixelText size={16} color={rankDisplay !== '–' ? WK.yellow : WK.dim} variant="vt323">
            {rankDisplay}
          </PixelText>
          <BodyText size={10} dim>REP {club.reputation.toFixed(1)}</BodyText>
          <BodyText size={10} color={WK.tealLight}>{(club.reputationTier ?? 'LOCAL').toUpperCase()}</BodyText>
        </View>
      </Pressable>

      {/* Squad Development */}
      <Pressable onPress={() => router.push('/(tabs)/hub?tab=PERFORMANCE')}>
        <SectionCard>
          <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Squad Development</PixelText>
          <SquadOVRDevelopmentCard players={players} currentWeek={club.weekNumber ?? 1} />
        </SectionCard>
      </Pressable>

      {/* Medical Report */}
      <SectionCard>
        <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Medical Report</PixelText>
        {injuredPlayers.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, backgroundColor: WK.green }} />
            <PixelText size={7} color={WK.green}>ALL CLEAR</PixelText>
          </View>
        ) : (
          <>
            {seriousCount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.red }} />
                  <BodyText size={12} dim>SERIOUS</BodyText>
                </View>
                <BodyText size={12} color={WK.red}>{seriousCount} player{seriousCount !== 1 ? 's' : ''}</BodyText>
              </View>
            )}
            {moderateCount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.orange }} />
                  <BodyText size={12} dim>MODERATE</BodyText>
                </View>
                <BodyText size={12} color={WK.orange}>{moderateCount} player{moderateCount !== 1 ? 's' : ''}</BodyText>
              </View>
            )}
            {minorCount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.yellow }} />
                  <BodyText size={12} dim>MINOR</BodyText>
                </View>
                <BodyText size={12} color={WK.yellow}>{minorCount} player{minorCount !== 1 ? 's' : ''}</BodyText>
              </View>
            )}
          </>
        )}
      </SectionCard>

    </ScrollView>

    <MatchResultOverlay
      visible={overlayFixtureId !== null}
      data={overlayData}
      onClose={() => setOverlayFixtureId(null)}
    />
  </>
  );
}
