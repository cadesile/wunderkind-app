import { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy, UserPlus } from 'lucide-react-native';
import useClubMetrics from '@/hooks/useClubMetrics';
import { useInboxStore } from '@/stores/inboxStore';
import { useClubStore } from '@/stores/clubStore';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { penceToPounds, formatCurrencyCompact } from '@/utils/currency';
import { getLeaderboard } from '@/api/endpoints/leaderboard';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { FanFavoriteCard } from '@/components/FanFavoriteCard';
import { WK, pixelShadow } from '@/constants/theme';
import { InboxMessage } from '@/stores/inboxStore';

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Position groups for squad development chart ──────────────────────────────

const POS_GROUPS: { label: string; positions: string[] }[] = [
  { label: 'GK',  positions: ['GK'] },
  { label: 'DEF', positions: ['CB','LB','RB','LWB','RWB','SW','DC','DL','DR'] },
  { label: 'MID', positions: ['CM','CAM','CDM','RM','LM','DM','AM','MC','ML','MR'] },
  { label: 'FWD', positions: ['ST','CF','LW','RW','SS','FW','FC','ATT','WL','WR'] },
];

function SquadDevelopmentChart({ players }: { players: import('@/types/player').Player[] }) {
  const active = players.filter((p) => p.isActive);
  if (active.length === 0) {
    return <PixelText size={7} dim>No players enrolled yet.</PixelText>;
  }

  const groups = POS_GROUPS.map((g) => {
    const inGroup = active.filter((p) =>
      g.positions.some((pos) => p.position?.toUpperCase().startsWith(pos)),
    );
    const avg = inGroup.length > 0
      ? inGroup.reduce((s, p) => s + p.overallRating, 0) / inGroup.length
      : 0;
    const avgPot = inGroup.length > 0
      ? inGroup.reduce((s, p) => s + p.potential, 0) / inGroup.length
      : 0;
    return { label: g.label, count: inGroup.length, avg, avgPot };
  }).filter((g) => g.count > 0);

  const MAX_OVR = 20;

  return (
    <View style={{ gap: 8 }}>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: WK.tealLight, borderWidth: 1, borderColor: WK.border }} />
          <BodyText size={10} dim>OVR</BodyText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: WK.yellow + '60', borderWidth: 1, borderColor: WK.yellow }} />
          <BodyText size={10} dim>POT</BodyText>
        </View>
      </View>

      {groups.map((g) => (
        <View key={g.label}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <View style={{ width: 28 }}>
              <PixelText size={7} color={WK.yellow}>{g.label}</PixelText>
            </View>
            {/* OVR bar */}
            <View style={{ flex: 1 }}>
              <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: WK.border, overflow: 'hidden' }}>
                {/* Potential backing bar */}
                <View style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: `${(g.avgPot / MAX_OVR) * 100}%`,
                  backgroundColor: WK.yellow + '40',
                }} />
                {/* OVR bar */}
                <View style={{
                  height: '100%',
                  width: `${(g.avg / MAX_OVR) * 100}%`,
                  backgroundColor: WK.tealLight,
                }} />
              </View>
            </View>
            <View style={{ width: 36, alignItems: 'flex-end' }}>
              <BodyText size={10} color={WK.tealLight}>{g.avg.toFixed(1)}</BodyText>
            </View>
            <View style={{ width: 22, alignItems: 'flex-end' }}>
              <BodyText size={10} dim>×{g.count}</BodyText>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Roster stacked bar ───────────────────────────────────────────────────────

function RosterStackedBar({ playerCount, coachCount }: { playerCount: number; coachCount: number }) {
  const total = playerCount + coachCount;
  if (total === 0) return null;

  return (
    <View>
      {/* Stacked bar — flex segments stay proportional without percentage maths */}
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

      {/* Count labels */}
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

// ─── League Position Card ─────────────────────────────────────────────────────

function LeaguePositionCard({ ampClubId }: { ampClubId: string }) {
  const league   = useLeagueStore((s) => s.league);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const club     = useClubStore((s) => s.club);

  if (!league) return null;

  // league.clubs only holds NPC clubs — the AMP is added separately when
  // fixtures are generated. Build standings from fixture results so the AMP
  // appears naturally in the table.
  const npcClubs = league.clubs;
  const allIds   = [ampClubId, ...npcClubs.map((c) => c.id)];

  type Standing = {
    id: string; name: string; primaryColor: string;
    pts: number; gd: number; gf: number; played: number;
  };

  const map: Record<string, Standing> = {};
  for (const id of allIds) {
    const isAmp = id === ampClubId;
    const snap  = npcClubs.find((c) => c.id === id);
    map[id] = {
      id,
      name:         isAmp ? club.name        : (snap?.name         ?? id),
      primaryColor: isAmp ? club.primaryColor : (snap?.primaryColor ?? '#888888'),
      pts: 0, gd: 0, gf: 0, played: 0,
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
    if      (homeGoals > awayGoals) { home.pts += 3; }
    else if (homeGoals < awayGoals) { away.pts += 3; }
    else                            { home.pts += 1; away.pts += 1; }
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
    <SectionCard>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <PixelText size={7} dim upper>League Table</PixelText>
        <BodyText size={10} dim numberOfLines={1}>{league.name.toUpperCase()}</BodyText>
      </View>

      {slice.map((entry, i) => {
        const position = start + i + 1;
        const isAmp    = entry.id === ampClubId;
        return (
          <View
            key={entry.id}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 7,
              paddingHorizontal: isAmp ? 6 : 0,
              borderBottomWidth: i < slice.length - 1 ? 1 : 0,
              borderBottomColor: WK.border,
              backgroundColor: isAmp ? WK.yellow + '1A' : 'transparent',
            }}
          >
            <PixelText size={8} color={isAmp ? WK.yellow : WK.dim} style={{ width: 36 }} numberOfLines={1}>
              #{position}
            </PixelText>
            <View style={{ width: 10, height: 10, backgroundColor: entry.primaryColor, borderWidth: 1, borderColor: WK.border }} />
            <BodyText size={13} color={isAmp ? WK.yellow : WK.text} style={{ flex: 1 }} numberOfLines={1}>
              {entry.name.toUpperCase()}
            </BodyText>
            <PixelText size={8} color={isAmp ? WK.yellow : WK.dim}>{entry.pts}pts</PixelText>
          </View>
        );
      })}
    </SectionCard>
  );
}

// ─── Latest Result + Form Card ────────────────────────────────────────────────

type Outcome = 'W' | 'D' | 'L';

const OUTCOME_COLOR: Record<Outcome, string> = {
  W: '#2E7D32',  // dark green — readable on teal card
  D: '#F9A825',  // yellow
  L: '#C62828',  // red
};

function getOutcome(homeGoals: number, awayGoals: number, isHome: boolean): Outcome {
  if (homeGoals === awayGoals) return 'D';
  return isHome ? (homeGoals > awayGoals ? 'W' : 'L') : (awayGoals > homeGoals ? 'W' : 'L');
}

function ResultFormCard({ ampClubId }: { ampClubId: string }) {
  const fixtures = useFixtureStore((s) => s.fixtures);
  const league   = useLeagueStore((s) => s.league);

  const played = fixtures
    .filter((f) => f.result !== null && (f.homeClubId === ampClubId || f.awayClubId === ampClubId))
    .sort((a, b) => new Date(b.result!.playedAt).getTime() - new Date(a.result!.playedAt).getTime());

  if (played.length === 0) return null;

  const latest  = played[0];
  const isHome  = latest.homeClubId === ampClubId;
  const { homeGoals, awayGoals } = latest.result!;
  const outcome = getOutcome(homeGoals, awayGoals, isHome);

  // Resolve opponent name from league clubs if available
  const opponentId   = isHome ? latest.awayClubId : latest.homeClubId;
  const opponentClub = league?.clubs.find((c) => c.id === opponentId);
  const opponentName = opponentClub?.name ?? 'OPPONENT';

  // Form: last 5, oldest → newest (left to right)
  const form: Outcome[] = played
    .slice(0, 5)
    .reverse()
    .map((f) => getOutcome(f.result!.homeGoals, f.result!.awayGoals, f.homeClubId === ampClubId));

  return (
    <SectionCard>
      <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Latest Result</PixelText>

      {/* Score row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{
          width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
          backgroundColor: OUTCOME_COLOR[outcome],
          borderWidth: 2, borderColor: WK.border,
        }}>
          <PixelText size={10} color={WK.text}>{outcome}</PixelText>
        </View>
        <PixelText size={14} color={WK.text}>{homeGoals} – {awayGoals}</PixelText>
        <View style={{ flex: 1 }}>
          <BodyText size={11} dim>{isHome ? 'HOME' : 'AWAY'}</BodyText>
          <BodyText size={12} color={WK.dim} numberOfLines={1}>vs {opponentName.toUpperCase()}</BodyText>
        </View>
      </View>

      {/* Form row */}
      {form.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BodyText size={11} dim style={{ marginRight: 2 }}>FORM</BodyText>
          {form.map((r, i) => (
            <View
              key={i}
              style={{
                width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
                backgroundColor: OUTCOME_COLOR[r],
                borderWidth: 1, borderColor: WK.border,
              }}
            >
              <PixelText size={8} color={WK.text}>{r}</PixelText>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClubDashboard() {
  const router = useRouter();
  const {
    totalValuation,
    reputationBonusPct,
    currentTier,
    nextTier,
    tierProgressPct,
    crownJewel,
    cashBalance,
    weeklyNetCashflow,
  } = useClubMetrics();

  const messages = useInboxStore((s) => s.messages);
  const club = useClubStore((s) => s.club);
  const archetypes = useArchetypeStore((s) => s.archetypes);
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);
  const { levels, conditions, templates: facilityTemplates } = useFacilityStore();
  const crownJewelArchetype = crownJewel
    ? getArchetypeForPlayer(crownJewel, archetypes)
    : null;

  // Most-recent 3 messages (store is newest-first)
  const recentMessages = messages.slice(0, 3);

  // ── Leaderboard position ─────────────────────────────────────────────────────
  const { data: lbData } = useQuery({
    queryKey: ['leaderboard', 'club_reputation', 'dashboard'],
    queryFn: () => getLeaderboard('club_reputation', { page: 1, pageSize: 100 }),
    staleTime: 10 * 60 * 1000,
    retry: 0,
    // @ts-ignore – gcTime is tanstack v5
    gcTime: 10 * 60 * 1000,
  });
  const myRank = lbData?.entries.findIndex((e) => e.clubName === club.name);
  const rankDisplay = (myRank !== undefined && myRank >= 0) ? `#${myRank + 1}` : '–';

  // ── Squad potential breakdown ────────────────────────────────────────────────
  const activePlayers = players.filter((p) => p.isActive);

  // ── Latest signing ───────────────────────────────────────────────────────────
  const latestSigning = activePlayers.length > 0
    ? activePlayers.reduce((best, p) => (p.joinedWeek ?? 0) > (best.joinedWeek ?? 0) ? p : best)
    : null;
  const avgPotential = activePlayers.length > 0
    ? activePlayers.reduce((sum, p) => sum + p.potential, 0) / activePlayers.length
    : 0;
  const highCeilingCount = activePlayers.filter((p) => p.potential >= 70).length;

  // ── Medical report ───────────────────────────────────────────────────────────
  const injuredPlayers = players.filter((p) => p.injury && p.injury.weeksRemaining > 0);
  const minorCount    = injuredPlayers.filter((p) => p.injury!.severity === 'minor').length;
  const moderateCount = injuredPlayers.filter((p) => p.injury!.severity === 'moderate').length;
  const seriousCount  = injuredPlayers.filter((p) => p.injury!.severity === 'serious').length;

  // ── Facilities summary ───────────────────────────────────────────────────────
  const builtFacilities = facilityTemplates.filter((t) => (levels[t.slug] ?? 0) > 0);

  // ── Derived display values ───────────────────────────────────────────────────
  const cashPounds        = penceToPounds(cashBalance);
  const isDeficit         = weeklyNetCashflow < 0;
  const tickDeltaPounds   = penceToPounds(weeklyNetCashflow);
  const tickDeltaColor    = isDeficit ? WK.red : WK.green;
  const tickDeltaSign     = isDeficit ? '-' : '+';
  const willGoNegative    = cashBalance + weeklyNetCashflow < 0;
  const careerSalesPounds = penceToPounds(club.totalCareerEarnings);

  // ── Deficit pulse animation ──────────────────────────────────────────────────
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (willGoNegative) {
      pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [willGoNegative]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const tierIdx  = TIER_ORDER.indexOf(currentTier);
  const nextLabel = nextTier ?? 'MAX';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}>
      <PitchBackground />

      {/* ── Card 1: Valuation Hero ────────────────────────────────────────── */}
      <SectionCard borderColor={WK.yellow}>
        <PixelText size={7} dim upper style={{ marginBottom: 6 }}>Club Value</PixelText>

        <PixelText size={22} color={WK.yellow} numberOfLines={1}>
          {formatCurrencyCompact(totalValuation)}
        </PixelText>

        <BodyText size={12} color={WK.green} style={{ marginTop: 4 }}>
          +{reputationBonusPct.toFixed(1)}% REPUTATION BONUS
        </BodyText>

        {/* Tier progress bar */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <PixelText size={6} color={WK.yellow} upper>{currentTier}</PixelText>
            <PixelText size={6} dim upper>{nextLabel}</PixelText>
          </View>
          <View style={{
            height: 8,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 2,
            borderColor: WK.border,
          }}>
            <View style={{
              height: '100%',
              width: `${tierProgressPct}%`,
              backgroundColor: WK.yellow,
            }} />
          </View>
          <BodyText size={11} dim style={{ marginTop: 4, textAlign: 'right' }}>
            {tierProgressPct.toFixed(0)}% through {currentTier}
          </BodyText>
        </View>
      </SectionCard>

      {/* ── League Position + Result/Form ────────────────────────────────── */}
      <LeaguePositionCard ampClubId={club.id} />
      <ResultFormCard ampClubId={club.id} />

      {/* ── Fan Base ────────────────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 10 }}>
        <FanFavoriteCard />
      </View>

      {/* ── Card 2: Financial Status ──────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 10,
        marginBottom: willGoNegative ? 6 : 10,
        gap: 10,
      }}>
        {/* Cash balance + next tick delta */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          ...pixelShadow,
        }}>
          <BodyText size={12} dim style={{ marginBottom: 6 }}>CASH</BodyText>
          <PixelText
            size={10}
            color={cashPounds >= 0 ? WK.tealLight : WK.red}
            numberOfLines={1}
          >
            {cashPounds < 0 ? '-' : ''}£{Math.abs(cashPounds).toLocaleString()}
          </PixelText>
          <BodyText size={11} color={tickDeltaColor} style={{ marginTop: 5 }}>
            {tickDeltaSign}£{Math.abs(tickDeltaPounds).toLocaleString()} NEXT TICK
          </BodyText>
        </View>

        {/* Career sales earnings */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          ...pixelShadow,
        }}>
          <BodyText size={12} dim style={{ marginBottom: 6 }}>SALES</BodyText>
          <PixelText size={10} color={WK.green} numberOfLines={1}>
            £{careerSalesPounds.toLocaleString()}
          </PixelText>
          <BodyText size={11} dim style={{ marginTop: 5 }}>CAREER TOTAL</BodyText>
        </View>
      </View>

      {/* ── Cards 2b: Latest Signing | Leaderboard Position ──────────────── */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 10,
        marginBottom: 10,
        gap: 10,
      }}>
        {/* Latest Signing */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          gap: 6,
          ...pixelShadow,
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

        {/* Leaderboard Position */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          gap: 6,
          ...pixelShadow,
        }}>
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
      </View>

      {/* ── Negative balance warning ──────────────────────────────────────── */}
      {willGoNegative && (
        <Animated.View style={[
          {
            marginHorizontal: 10,
            marginBottom: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2,
            borderColor: WK.red,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          pulseStyle,
        ]}>
          <View style={{ width: 6, height: 6, backgroundColor: WK.red, flexShrink: 0 }} />
          <BodyText size={13} color={WK.red}>
            BALANCE WILL BE NEGATIVE AFTER NEXT TICK
          </BodyText>
        </Animated.View>
      )}

      {/* ── Card 3: Crown Jewel player ────────────────────────────────────── */}
      {crownJewel ? (
        <Pressable onPress={() => router.push(`/player/${crownJewel.id}`)}>
          <SectionCard borderColor={WK.tealLight}>
            <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Crown Jewel</PixelText>

            {/* Top row: avatar + name/position/nationality */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <Avatar
                appearance={crownJewel.appearance}
                role="PLAYER"
                size={56}
                morale={crownJewel.morale ?? 70}
                age={crownJewel.age}
              />
              <View style={{ flex: 1 }}>
                <BodyText size={15} upper numberOfLines={1}>{crownJewel.name}</BodyText>
                <BodyText size={12} color={WK.tealLight} style={{ marginTop: 3 }}>
                  {crownJewel.position} · AGE {crownJewel.age}
                </BodyText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <FlagText nationality={crownJewel.nationality} size={14} />
                  <BodyText size={12} dim>{crownJewel.nationality}</BodyText>
                </View>
              </View>
              <Badge label={`OVR ${crownJewel.overallRating}`} color="yellow" />
            </View>

            {/* Archetype row */}
            {crownJewelArchetype && (
              <View style={{
                borderTopWidth: 2,
                borderTopColor: WK.border,
                paddingTop: 8,
              }}>
                <View style={{
                  backgroundColor: WK.yellow,
                  borderWidth: 2,
                  borderColor: WK.border,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  alignSelf: 'flex-start',
                  marginBottom: 6,
                }}>
                  <PixelText size={6} color={WK.border}>{crownJewelArchetype.name.toUpperCase()}</PixelText>
                </View>
                <BodyText size={12} dim style={{ lineHeight: 18 }}>
                  {crownJewelArchetype.description}
                </BodyText>
              </View>
            )}
          </SectionCard>
        </Pressable>
      ) : (
        <SectionCard>
          <PixelText size={7} dim upper style={{ marginBottom: 6 }}>Crown Jewel</PixelText>
          <PixelText size={7} dim>No players enrolled yet.</PixelText>
        </SectionCard>
      )}

      {/* ── Card 3b: Squad Development chart ─────────────────────────────── */}
      <SectionCard>
        <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Squad Development</PixelText>
        <SquadDevelopmentChart players={players} />
      </SectionCard>

      {/* ── Card 4: Medical Report ───────────────────────────────────────── */}
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
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.red }} />
                  <BodyText size={12} dim>SERIOUS</BodyText>
                </View>
                <BodyText size={12} color={WK.red}>{seriousCount} player{seriousCount !== 1 ? 's' : ''}</BodyText>
              </View>
            )}
            {moderateCount > 0 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.orange }} />
                  <BodyText size={12} dim>MODERATE</BodyText>
                </View>
                <BodyText size={12} color={WK.orange}>{moderateCount} player{moderateCount !== 1 ? 's' : ''}</BodyText>
              </View>
            )}
            {minorCount > 0 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7,
              }}>
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

      {/* ── Card 5: Facilities ────────────────────────────────────────────── */}
      <SectionCard>
        <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Facilities</PixelText>
        {builtFacilities.length === 0 ? (
          <PixelText size={7} dim>No facilities built yet.</PixelText>
        ) : (
          <>
            {/* Header row */}
            <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <View style={{ flex: 1 }}>
                <BodyText size={11} dim>FACILITY</BodyText>
              </View>
              <View style={{ width: 44, alignItems: 'center' }}>
                <BodyText size={11} dim>LVL</BodyText>
              </View>
              <View style={{ width: 56, alignItems: 'flex-end' }}>
                <BodyText size={11} dim>COND.</BodyText>
              </View>
            </View>
            {builtFacilities.map((def) => {
              const lvl  = levels[def.slug] ?? 0;
              const cond = Math.round(conditions[def.slug] ?? 100);
              const condColor = cond >= 60 ? WK.tealLight : cond >= 30 ? WK.orange : WK.red;
              return (
                <View
                  key={def.slug}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <BodyText size={13} numberOfLines={1}>{def.label}</BodyText>
                  </View>
                  <View style={{ width: 44, alignItems: 'center' }}>
                    <PixelText size={8} color={WK.yellow}>{lvl}</PixelText>
                  </View>
                  <View style={{ width: 56, alignItems: 'flex-end' }}>
                    <PixelText size={8} color={condColor}>{cond}%</PixelText>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>

      {/* ── Cards 6 & 7: Roster balance + Squad potential (side by side) ─── */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: 10, gap: 10 }}>

        {/* Roster balance — stacked horizontal bar */}
        <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
          <PixelText size={7} dim upper style={{ marginBottom: 12 }}>Roster Balance</PixelText>
          <RosterStackedBar
            playerCount={activePlayers.length}
            coachCount={coaches.length}
          />
        </View>

        {/* Squad stats */}
        <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
          {/* Squad potential widget */}
          <View style={{ paddingBottom: 8, marginBottom: 2, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <BodyText size={12} dim style={{ marginBottom: 6 }}>SQUAD POTENTIAL</BodyText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <PixelText size={11} color={WK.yellow}>{avgPotential.toFixed(1)}</PixelText>
              <BodyText size={11} dim>/ 100 AVG</BodyText>
            </View>
            <View style={{
              height: 6,
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderWidth: 1,
              borderColor: WK.border,
              marginBottom: 6,
              overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${Math.min(avgPotential, 100)}%`,
                backgroundColor: WK.yellow,
              }} />
            </View>
            <BodyText size={11} color={highCeilingCount > 0 ? WK.tealLight : WK.dim}>
              {highCeilingCount} HIGH CEILING
            </BodyText>
          </View>

          <StatRow
            label="Reputation"
            value={`${club.reputation.toFixed(1)} / 100`}
            valueColor={WK.tealLight}
          />
          <StatRow
            label="Tier"
            value={currentTier.toUpperCase()}
            valueColor={WK.orange}
          />
        </View>
      </View>

      {/* ── Card 7: Inbox preview ─────────────────────────────────────────── */}
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
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
              }}
            >
              {/* Unread indicator dot */}
              <View style={{
                width: 6,
                height: 6,
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
    </ScrollView>
  );
}
