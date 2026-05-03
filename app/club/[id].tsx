import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, VT323Text, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { WK, pixelShadow } from '@/constants/theme';
import { PixelFootballBadge, getNpcBadgeShape } from '@/components/ui/ClubBadge/PixelFootballBadge';
import { useWorldStore } from '@/stores/worldStore';
import { useClubStore } from '@/stores/clubStore';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import type { WorldPlayer } from '@/types/world';

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

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const club    = useWorldStore((s) => s.clubs[id]);
  const isInitialized = useWorldStore((s) => s.isInitialized);
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);

  const season = `Season ${Math.ceil(weekNumber / 38)}`;

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  const dashStats = useMemo(() => {
    if (!club) return null;

    let topScorer: WorldPlayer | null = null;
    let topScorerGoals = -1;
    let topAssister: WorldPlayer | null = null;
    let topAssisterAssists = -1;
    let topPlayer: WorldPlayer | null = null;
    let topOvr = -1;

    for (const p of club.players) {
      const ovr = calcOvr(p);
      if (ovr > topOvr) { topOvr = ovr; topPlayer = p; }

      const apps = p.appearances?.[season]?.[club.id] ?? [];
      const goals = apps.reduce((s, a) => s + (a.goals ?? 0), 0);
      const assists = apps.reduce((s, a) => s + (a.assists ?? 0), 0);
      if (goals > topScorerGoals) { topScorerGoals = goals; topScorer = p; }
      if (assists > topAssisterAssists) { topAssisterAssists = assists; topAssister = p; }
    }

    // Latest signing: highest uuidv7 string = most recently created/transferred
    const latestSigning = [...club.players].sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;

    return { topScorer, topScorerGoals, topAssister, topAssisterAssists, topPlayer, topOvr, latestSigning };
  }, [club, season]);

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
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: WK.border,
            backgroundColor: WK.tealDark,
          }}>
            <PixelText size={6} color={WK.dim} style={{ width: 38 }}>POS</PixelText>
            <PixelText size={6} color={WK.dim} style={{ flex: 1 }}>
              PLAYER ({players.length})
            </PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 22, textAlign: 'center' }}>NAT</PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 28, textAlign: 'right' }}>AGE</PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 36, textAlign: 'right' }}>MOR</PixelText>
            <PixelText size={6} color={WK.dim} style={{ width: 32, textAlign: 'right' }}>OVR</PixelText>
            <View style={{ width: 14 }} />
          </View>

          {players.map((p, i) => {
            const ovr = calcOvr(p);
            const pos = POS_DISPLAY[p.position] ?? p.position;
            const age = computePlayerAge(p.dateOfBirth, gameDate);
            // Derive pseudo-morale from personality traits (1–20 → 0–100)
            const morale = Math.round(
              (p.personality.determination + p.personality.professionalism +
               p.personality.adaptability + p.personality.pressure +
               p.personality.temperament + p.personality.consistency) / 6 / 20 * 100,
            );
            const moraleColor = morale >= 60 ? '#4CAF50' : morale >= 40 ? WK.yellow : WK.red;

            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/player/${p.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderBottomWidth: i < players.length - 1 ? 1 : 0,
                  borderBottomColor: WK.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {/* POS */}
                <View style={{
                  width: 38,
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
                <View style={{ width: 22, alignItems: 'center' }}>
                  <FlagText nationality={p.nationality} size={14} />
                </View>

                {/* Age */}
                <VT323Text size={16} color={WK.dim} style={{ width: 28, textAlign: 'right' }}>
                  {age}
                </VT323Text>

                {/* Morale — mini bar */}
                <View style={{ width: 36, paddingLeft: 6 }}>
                  <MoraleBar morale={morale} width={30} />
                </View>

                {/* OVR */}
                <VT323Text size={18} color={WK.yellow} style={{ width: 32, textAlign: 'right' }}>
                  {ovr}
                </VT323Text>

                <ChevronRight size={12} color={WK.dim} style={{ marginLeft: 2 }} />
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
