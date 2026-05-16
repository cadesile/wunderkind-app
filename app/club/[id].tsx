import { useMemo } from 'react';
import { View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { WK, pixelShadow } from '@/constants/theme';
import { PixelFootballBadge, getNpcBadgeShape } from '@/components/ui/ClubBadge/PixelFootballBadge';
import { useWorldStore } from '@/stores/worldStore';
import { useClubStore } from '@/stores/clubStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { Money } from '@/components/ui/Money';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import type { WorldPlayer, WorldStaff } from '@/types/world';
import { Avatar } from '@/components/ui/Avatar';

function calcOvr(p: WorldPlayer): number {
  return Math.round((p.pace + p.technical + p.vision + p.power + p.stamina + p.heart) / 6);
}

function shortName(p: WorldPlayer): string {
  return `${p.firstName[0]}. ${p.lastName}`;
}

const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
const POS_DISPLAY: Record<string, string> = { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'FWD' };

// ─── Dashboard stat card ──────────────────────────────────────────────────────

function DashCard({
  title,
  name,
  position,
  statValue,
  statLabel,
  statColor,
  dimStat,
}: {
  title: string;
  name: string;
  position: string;
  statValue: string;
  statLabel: string;
  statColor: string;
  dimStat?: boolean;
}) {
  return (
    <View style={[{
      flex: 1,
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
    }, pixelShadow]}>
      {/* Card header */}
      <View style={{
        backgroundColor: WK.tealDark,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}>
        <PixelText size={7} color={WK.yellow}>{title}</PixelText>
      </View>
      {/* Card body */}
      <View style={{ padding: 10, gap: 6 }}>
        {/* Stat value + position badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <VT323Text size={26} color={dimStat ? WK.dim : statColor}>
            {statValue}
          </VT323Text>
          <View style={{
            paddingHorizontal: 5, paddingVertical: 2,
            borderWidth: 1, borderColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={6} color={WK.tealLight}>{position}</PixelText>
          </View>
        </View>
        <PixelText size={6} color={WK.dim}>{statLabel}</PixelText>
        <BodyText size={12} style={{ color: WK.text }} numberOfLines={1}>
          {name}
        </BodyText>
      </View>
    </View>
  );
}

const STAFF_ROLE_LABEL: Record<string, string> = {
  manager: 'MANAGER',
  director_of_football: 'DOF',
  chairman: 'CHAIRMAN',
};

function StaffProfile({ member }: { member: WorldStaff }) {
  const label = STAFF_ROLE_LABEL[member.role] ?? member.role.toUpperCase();
  const isManager = member.role === 'manager';

  return (
    <View style={{
      flex: 1,
      backgroundColor: WK.tealDark,
      borderWidth: 2,
      borderColor: WK.border,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      gap: 6,
    }}>
      {/* Role badge */}
      <View style={{
        backgroundColor: WK.greenDark,
        borderWidth: 1,
        borderColor: WK.border,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignSelf: 'center',
      }}>
        <PixelText size={5} color={WK.yellow}>{label}</PixelText>
      </View>

      {/* Avatar */}
      <Avatar appearance={member.appearance} role="COACH" size={42} morale={70} />

      {/* Name */}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <BodyText size={11} style={{ color: WK.text, textAlign: 'center' }} numberOfLines={1}>
          {member.firstName[0]}. {member.lastName}
        </BodyText>
        <FlagText nationality={member.nationality} size={12} />
      </View>

      {/* Stat */}
      {isManager && member.preferredFormation ? (
        <PixelText size={6} color={WK.tealLight}>{member.preferredFormation}</PixelText>
      ) : (
        <VT323Text size={16} color={WK.dim}>{member.coachingAbility}</VT323Text>
      )}
    </View>
  );
}

type NpcTransferEntry = {
  week: number;
  playerName: string;
  direction: 'in' | 'out'; // relative to this club
  otherClub: string;
  fee: number; // pence
};

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const club    = useWorldStore((s) => s.clubs[id]);
  const league  = useWorldStore((s) => s.leagues.find((l) => l.clubIds.includes(id)));
  const isInitialized = useWorldStore((s) => s.isInitialized);
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const inboxMessages = useInboxStore((s) => s.messages);
  const ampTransfers  = useFinanceStore((s) => s.transfers);

  const db = useSQLiteContext();

  // Derive the active season from the DB rather than weekNumber to avoid mismatch
  const { data: maxSeasonRow } = useQuery({
    queryKey: ['club-max-season', id],
    queryFn: () => db.getFirstAsync<{ season: number }>(
      'SELECT MAX(season) as season FROM player_season_stats WHERE club_id = ?',
      [id],
    ),
    enabled: !!id,
  });
  const currentSeason = maxSeasonRow?.season ?? Math.ceil(weekNumber / 38);
  const season = `Season ${currentSeason}`;

  type ClubStatsRow = { player_id: string; goals: number; assists: number };
  const { data: clubStatsRows = [] } = useQuery({
    queryKey: ['club-season-stats', id, currentSeason],
    queryFn: () => db.getAllAsync<ClubStatsRow>(
      `SELECT player_id, SUM(goals) as goals, SUM(assists) as assists
       FROM player_season_stats
       WHERE club_id = ? AND season = ?
       GROUP BY player_id`,
      [id, currentSeason],
    ),
    enabled: !!id,
  });

  // ── NPC transfer history for this club ───────────────────────────────────────
  const npcTransfers = useMemo<NpcTransferEntry[]>(() => {
    if (!club) return [];
    const entries: NpcTransferEntry[] = [];

    // Source 1: NPC-to-NPC digest inbox messages
    for (const msg of inboxMessages) {
      if (msg.type !== 'system') continue;
      const meta = msg.metadata as Record<string, unknown> | undefined;
      if (meta?.systemType !== 'npc_transfers') continue;
      const transfers = meta.transfers as Array<{
        playerName: string; fromClub: string; toClub: string; fee: number;
      }> | undefined;
      if (!transfers) continue;
      for (const t of transfers) {
        if (t.toClub === club.name) {
          entries.push({ week: msg.week, playerName: t.playerName, direction: 'in', otherClub: t.fromClub, fee: t.fee });
        } else if (t.fromClub === club.name) {
          entries.push({ week: msg.week, playerName: t.playerName, direction: 'out', otherClub: t.toClub, fee: t.fee });
        }
      }
    }

    // Source 2: AMP academy transfers involving this club
    const ampClubName = useClubStore.getState().club.name ?? '';
    for (const t of ampTransfers) {
      if (t.direction === 'out' && t.destinationClub === club.name) {
        // AMP sold a player to this NPC club
        entries.push({ week: t.week, playerName: t.playerName, direction: 'in', otherClub: ampClubName, fee: t.grossFee });
      } else if (t.direction === 'in' && (t.fromClub === club.name)) {
        // AMP signed a player from this NPC club
        entries.push({ week: t.week, playerName: t.playerName, direction: 'out', otherClub: ampClubName, fee: t.grossFee });
      }
    }

    return entries.sort((a, b) => b.week - a.week);
  }, [club, inboxMessages, ampTransfers]);

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  const dashStats = useMemo(() => {
    if (!club) return null;

    let topScorer: WorldPlayer | null = null;
    let topScorerGoals = 0;
    let topAssister: WorldPlayer | null = null;
    let topAssisterAssists = 0;
    let topPlayer: WorldPlayer | null = null;
    let topOvr = -1;

    // Build a season-filtered lookup of goals/assists per playerId for this club.
    const statsById = new Map<string, { goals: number; assists: number }>();
    for (const r of clubStatsRows) {
      statsById.set(r.player_id, { goals: r.goals, assists: r.assists });
    }

    for (const p of club.players) {
      const ovr = calcOvr(p);
      if (ovr > topOvr) { topOvr = ovr; topPlayer = p; }

      const stats = statsById.get(p.id);
      const goals   = stats?.goals   ?? 0;
      const assists = stats?.assists ?? 0;
      if (goals > topScorerGoals) { topScorerGoals = goals; topScorer = p; }
      if (assists > topAssisterAssists) { topAssisterAssists = assists; topAssister = p; }
    }

    // Latest signing: highest uuidv7 string = most recently created/transferred
    const latestSigning = [...club.players].sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;

    return { topScorer, topScorerGoals, topAssister, topAssisterAssists, topPlayer, topOvr, latestSigning };
  }, [club, clubStatsRows]);

  if (!club) {
    // isInitialized true but clubs still empty = loadClubs() still running
    const loading = isInitialized && Object.keys(useWorldStore.getState().clubs).length === 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} color={WK.dim}>{loading ? 'LOADING...' : 'CLUB NOT FOUND'}</PixelText>
      </SafeAreaView>
    );
  }

  const players = [...club.players].sort((a, b) => {
    const posDiff = (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9);
    if (posDiff !== 0) return posDiff;
    return calcOvr(b) - calcOvr(a);
  });

  const gameDate = getGameDate(weekNumber);

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
        <View style={{ flex: 1 }}>
          <PixelText size={9} numberOfLines={1}>{club.name}</PixelText>
          {league ? (
            <BodyText size={10} dim numberOfLines={1}>{league.name.toUpperCase()}</BodyText>
          ) : null}
        </View>
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
          {/* Club badge */}
          <PixelFootballBadge
            baseShape={getNpcBadgeShape(club.id)}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            size={52}
          />
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

        {/* ── Staff profiles ──────────────────────────────────────────────── */}
        {(() => {
          const keyRoles = ['manager', 'director_of_football', 'chairman'];
          const staffProfiles = keyRoles
            .map((role) => club.staff.find((s) => s.role === role))
            .filter((s): s is WorldStaff => !!s);
          if (staffProfiles.length === 0) return null;
          return (
            <View style={[{
              borderWidth: 3,
              borderColor: WK.border,
              overflow: 'hidden',
            }, pixelShadow]}>
              <View style={{
                backgroundColor: WK.tealMid,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}>
                <PixelText size={7} color={WK.yellow}>CLUB LEADERSHIP</PixelText>
              </View>
              <View style={{ flexDirection: 'row', gap: 0 }}>
                {staffProfiles.map((s, i) => (
                  <View key={s.id} style={{ flex: 1, borderLeftWidth: i > 0 ? 2 : 0, borderLeftColor: WK.border }}>
                    <StaffProfile member={s} />
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ── Dashboard cards 2×2 ─────────────────────────────────────────── */}
        {dashStats && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <DashCard
                title="TOP SCORER"
                name={dashStats.topScorer ? shortName(dashStats.topScorer) : '—'}
                position={dashStats.topScorer ? POS_DISPLAY[dashStats.topScorer.position] ?? dashStats.topScorer.position : '—'}
                statValue={dashStats.topScorerGoals > 0 ? String(dashStats.topScorerGoals) : '—'}
                statLabel="GOALS THIS SEASON"
                statColor="#4CAF50"
                dimStat={dashStats.topScorerGoals <= 0}
              />
              <DashCard
                title="MOST ASSISTS"
                name={dashStats.topAssister ? shortName(dashStats.topAssister) : '—'}
                position={dashStats.topAssister ? POS_DISPLAY[dashStats.topAssister.position] ?? dashStats.topAssister.position : '—'}
                statValue={dashStats.topAssisterAssists > 0 ? String(dashStats.topAssisterAssists) : '—'}
                statLabel="ASSISTS THIS SEASON"
                statColor={WK.tealLight}
                dimStat={dashStats.topAssisterAssists <= 0}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <DashCard
                title="TOP PLAYER"
                name={dashStats.topPlayer ? shortName(dashStats.topPlayer) : '—'}
                position={dashStats.topPlayer ? POS_DISPLAY[dashStats.topPlayer.position] ?? dashStats.topPlayer.position : '—'}
                statValue={dashStats.topOvr > 0 ? String(dashStats.topOvr) : '—'}
                statLabel="OVERALL RATING"
                statColor={WK.yellow}
              />
              <DashCard
                title="LATEST SIGNING"
                name={dashStats.latestSigning ? shortName(dashStats.latestSigning) : '—'}
                position={dashStats.latestSigning ? POS_DISPLAY[dashStats.latestSigning.position] ?? dashStats.latestSigning.position : '—'}
                statValue={dashStats.latestSigning ? String(calcOvr(dashStats.latestSigning)) : '—'}
                statLabel="OVERALL RATING"
                statColor={WK.dim}
                dimStat
              />
            </View>
          </>
        )}

        {/* Players roster table */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
        }, pixelShadow]}>
          {/* Column headers */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={6} color={WK.dim} style={{ width: 36, flexShrink: 0 }}>POS</PixelText>
            <PixelText size={6} color={WK.dim} style={{ flex: 1 }}>
              PLAYER ({players.length})
            </PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>NAT</PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 28, textAlign: 'right', flexShrink: 0 }}>AGE</PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>OVR</PixelText>
            <View style={{ width: 14, flexShrink: 0 }} />
          </View>

          {players.map((p, i) => {
            const ovr = calcOvr(p);
            const pos = POS_DISPLAY[p.position] ?? p.position;
            const age = computePlayerAge(p.dateOfBirth, gameDate);

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.6}
                onPress={() => router.push(`/player/${p.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 9,
                  borderBottomWidth: i < players.length - 1 ? 1 : 0,
                  borderBottomColor: WK.border,
                }}
              >
                {/* POS */}
                <View style={{
                  width: 36,
                  flexShrink: 0,
                  backgroundColor: WK.tealDark,
                  borderWidth: 1,
                  borderColor: WK.border,
                  paddingVertical: 2,
                  alignItems: 'center',
                }}>
                  <PixelText size={6} color={WK.tealLight}>{pos}</PixelText>
                </View>

                {/* Name */}
                <BodyText
                  size={13}
                  style={{ flex: 1, color: WK.text, paddingLeft: 8 }}
                  numberOfLines={1}
                >
                  {p.firstName} {p.lastName}
                </BodyText>

                {/* Nationality flag */}
                <View style={{ width: 20, flexShrink: 0, alignItems: 'center' }}>
                  <FlagText nationality={p.nationality} size={14} />
                </View>

                {/* Age */}
                <VT323Text size={16} color={WK.dim} style={{ width: 28, flexShrink: 0, textAlign: 'right' }}>
                  {age}
                </VT323Text>

                {/* OVR */}
                <VT323Text size={18} color={WK.yellow} style={{ width: 32, flexShrink: 0, textAlign: 'right' }}>
                  {ovr}
                </VT323Text>

                <ChevronRight size={12} color={WK.dim} style={{ marginLeft: 2, flexShrink: 0 }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Transfer history ──────────────────────────────────────────────── */}
        <View style={[{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
        }, pixelShadow]}>
          {/* Section header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={7} color={WK.yellow}>TRANSFERS</PixelText>
            <PixelText size={6} color={WK.dim}>{npcTransfers.length} RECORDS</PixelText>
          </View>

          {npcTransfers.length === 0 ? (
            <View style={{ padding: 14, alignItems: 'center' }}>
              <PixelText size={7} color={WK.dim}>NO TRANSFERS RECORDED</PixelText>
            </View>
          ) : (
            npcTransfers.map((t, i) => (
              <View
                key={`${t.week}-${t.playerName}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderBottomWidth: i < npcTransfers.length - 1 ? 1 : 0,
                  borderBottomColor: WK.border,
                  gap: 8,
                }}
              >
                {/* Direction arrow */}
                {t.direction === 'in' ? (
                  <ArrowDownLeft size={13} color={WK.green} />
                ) : (
                  <ArrowUpRight size={13} color={WK.yellow} />
                )}

                {/* Player + other club */}
                <View style={{ flex: 1 }}>
                  <BodyText size={13} numberOfLines={1} style={{ color: WK.text }}>{t.playerName}</BodyText>
                  <BodyText size={10} numberOfLines={1} color={WK.dim}>
                    {t.direction === 'in' ? `from ${t.otherClub}` : `to ${t.otherClub}`}
                  </BodyText>
                </View>

                {/* Week + fee */}
                <View style={{ alignItems: 'flex-end' }}>
                  <PixelText size={6} color={WK.dim}>WK {t.week}</PixelText>
                  {t.fee > 0 && (
                    <Money pence={t.fee} style="compact" size={14} variant="vt323" color={WK.yellow} />
                  )}
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
