import { useState, useMemo } from 'react';
import { usePlayerSeasonStats } from '@/hooks/db/usePlayerSeasonStats';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { useWorldStore } from '@/stores/worldStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { useUnifiedPlayer } from '@/hooks/useUnifiedPlayer';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { AttributesRadar } from '@/components/radar/AttributesRadar';
import { Money } from '@/components/ui/Money';
import { WK, pixelShadow, traitColor } from '@/constants/theme';
import { AttributeName, TraitName, PlayerAppearances } from '@/types/player';
import { usePlayerAppearances } from '@/hooks/db/usePlayerAppearances';
import { Guardian } from '@/types/guardian';
import { getGameDate, computePlayerAge } from '@/utils/gameDate';
import { useCalendarStore } from '@/stores/calendarStore';
import { isTransferWindowOpen, getNextTransferWindowDate } from '@/utils/dateUtils';
import { calculateExtensionCost, calculateWeeklyWage } from '@/engine/finance';
import { moraleLabel } from '@/utils/morale';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { getLoyaltyNote, getDemandNote } from '@/utils/guardianNarrative';
import { ScoutReportCard } from '@/components/ScoutReportCard';
import { DevelopmentChart } from '@/components/ui/DevelopmentChart';

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTR_LABELS: Record<AttributeName, string> = {
  pace: 'PACE', technical: 'TECHNICAL', vision: 'VISION',
  power: 'POWER', stamina: 'STAMINA', heart: 'HEART',
};

const TRAIT_ORDER: TraitName[] = [
  'determination', 'professionalism', 'ambition', 'loyalty',
  'adaptability', 'pressure', 'temperament', 'consistency',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guardianLabel(g: Guardian, all: Guardian[], i: number): string {
  const sameGender = all.filter((x) => x.gender === g.gender).length;
  if (sameGender > 1) return `GUARDIAN ${i + 1}`;
  return g.gender === 'female' ? 'MUM' : 'DAD';
}

function attrColor(value: number): string {
  if (value >= 70) return WK.yellow;
  if (value >= 40) return WK.tealLight;
  return WK.red;
}

function loyaltyChip(loyalty: number): { label: string; color: 'green' | 'yellow' | 'red' } {
  if (loyalty >= 70) return { label: 'LOYAL', color: 'green' };
  if (loyalty >= 40) return { label: 'NEUTRAL', color: 'yellow' };
  return { label: 'HOSTILE', color: 'red' };
}

function moraleColor(morale: number): 'green' | 'yellow' | 'red' {
  if (morale >= 60) return 'green';
  if (morale >= 40) return 'yellow';
  return 'red';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, marginVertical: 2 }}>
      <View style={{ flex: 1, height: 2, backgroundColor: WK.border }} />
      <PixelText size={7} color={WK.dim}>{label}</PixelText>
      <View style={{ flex: 1, height: 2, backgroundColor: WK.border }} />
    </View>
  );
}

function AppearancesCard({
  appearances,
  currentClubId,
  currentClubName,
  onViewHistory,
}: {
  appearances: PlayerAppearances;
  currentClubId: string;
  currentClubName: string;
  onViewHistory: () => void;
}) {
  // Aggregate only for the current club across all seasons
  let totalGames = 0;
  let totalRating = 0;
  let totalWins = 0;
  let totalGoals = 0;
  let totalAssists = 0;

  for (const season of Object.keys(appearances)) {
    const clubApps = appearances[season][currentClubId] ?? [];
    for (const app of clubApps) {
      totalGames++;
      totalRating += app.rating;
      totalGoals += app.goals ?? 0;
      totalAssists += app.assists ?? 0;
      if (app.result === 'win') totalWins++;
    }
  }

  if (totalGames === 0) return null;

  const avgRating = (totalRating / totalGames).toFixed(1);
  const winRate   = Math.round((totalWins / totalGames) * 100);

  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, ...pixelShadow }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <PixelText size={9} color={WK.yellow}>APPEARANCES</PixelText>
        <BodyText size={11} color={WK.dim} numberOfLines={1}>{currentClubName}</BodyText>
      </View>

      {/* Summary stats row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 14 }}>
        {[
          { label: 'APPS',    value: String(totalGames)    },
          { label: 'AVG RTG', value: avgRating             },
          { label: 'WIN %',   value: `${winRate}%`         },
          { label: 'GOALS',   value: String(totalGoals)    },
          { label: 'ASSISTS', value: String(totalAssists)  },
        ].map((stat, i) => (
          <View key={stat.label} style={{
            flex: 1, alignItems: 'center',
            borderLeftWidth: i > 0 ? 2 : 0, borderLeftColor: WK.border,
          }}>
            <PixelText size={13} color={WK.yellow}>{stat.value}</PixelText>
            <PixelText size={6} color={WK.dim} style={{ marginTop: 4 }}>{stat.label}</PixelText>
          </View>
        ))}
      </View>

      {/* History link */}
      <Pressable
        onPress={onViewHistory}
        style={{
          borderTopWidth: 2, borderTopColor: WK.border,
          paddingHorizontal: 14, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <PixelText size={7} color={WK.tealLight}>VIEW APPEARANCE HISTORY</PixelText>
        <PixelText size={7} color={WK.dim}>→</PixelText>
      </Pressable>
    </View>
  );
}

function AttributeBar({ name, value }: { name: AttributeName; value: number }) {
  const color = attrColor(value);
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <PixelText size={9} dim>{ATTR_LABELS[name]}</PixelText>
        <PixelText size={9} color={color}>{Math.round(value)}</PixelText>
      </View>
      <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
        <View style={{ height: '100%', width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

// ─── Transfer History section ─────────────────────────────────────────────────

function TransferHistorySection({
  playerId,
  ampClubId,
  ampClubName,
  worldClubs,
}: {
  playerId: string;
  ampClubId: string;
  ampClubName: string;
  worldClubs: Record<string, { name: string }>;
}) {
  const { data: seasonStats = [] } = usePlayerSeasonStats(playerId);

  const byClub = useMemo(() => {
    const map = new Map<string, { goals: number; assists: number; appearances: number }>();
    for (const r of seasonStats) {
      const prev = map.get(r.clubId);
      if (prev) {
        map.set(r.clubId, {
          goals:       prev.goals + r.goals,
          assists:     prev.assists + r.assists,
          appearances: prev.appearances + r.appearances,
        });
      } else {
        map.set(r.clubId, { goals: r.goals, assists: r.assists, appearances: r.appearances });
      }
    }
    return Array.from(map.entries()).map(([clubId, stats]) => ({ clubId, ...stats }));
  }, [seasonStats]);

  if (byClub.length === 0) return null;

  function resolveClubName(clubId: string): string {
    if (clubId === ampClubId) return ampClubName;
    return worldClubs[clubId]?.name ?? clubId;
  }

  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, ...pixelShadow }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <PixelText size={9} color={WK.yellow}>TRANSFER HISTORY</PixelText>
      </View>

      {/* Column headers */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 8,
        borderBottomWidth: 2, borderBottomColor: WK.border,
        backgroundColor: WK.tealDark,
      }}>
        <VT323Text size={14} color={WK.dim} style={{ flex: 1, minWidth: 0 }}>CLUB</VT323Text>
        <VT323Text size={14} color={WK.dim} style={{ width: 44, flexShrink: 0, textAlign: 'right' }}>APPS</VT323Text>
        <VT323Text size={14} color={WK.dim} style={{ width: 44, flexShrink: 0, textAlign: 'right' }}>GOALS</VT323Text>
        <VT323Text size={14} color={WK.dim} style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>ASSISTS</VT323Text>
        <VT323Text size={14} color={WK.dim} style={{ width: 56, flexShrink: 0, textAlign: 'right' }}>FEE</VT323Text>
      </View>

      {/* Rows */}
      {byClub.map((entry, i) => (
        <View
          key={entry.clubId}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 10,
            borderBottomWidth: i < byClub.length - 1 ? 2 : 0,
            borderBottomColor: WK.border,
          }}
        >
          <BodyText size={12} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
            {resolveClubName(entry.clubId)}
          </BodyText>
          <VT323Text
            size={18}
            color={entry.appearances > 0 ? WK.text : WK.dim}
            style={{ width: 44, flexShrink: 0, textAlign: 'right' }}
          >
            {entry.appearances}
          </VT323Text>
          <VT323Text
            size={18}
            color={entry.goals > 0 ? WK.yellow : WK.dim}
            style={{ width: 44, flexShrink: 0, textAlign: 'right' }}
          >
            {entry.goals}
          </VT323Text>
          <VT323Text
            size={18}
            color={entry.assists > 0 ? WK.tealLight : WK.dim}
            style={{ width: 52, flexShrink: 0, textAlign: 'right' }}
          >
            {entry.assists}
          </VT323Text>
          <VT323Text size={16} color={WK.dim} style={{ width: 56, flexShrink: 0, textAlign: 'right' }}>
            —
          </VT323Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const { player, isNpc, clubColors, clubName: npcClubName } = useUnifiedPlayer(id ?? null);
  const debugEnabled          = useGameConfigStore((s) => s.config.debugLoggingEnabled);
  const wageMultiplierTiers   = useGameConfigStore((s) => s.config.wageMultiplierTiers);
  const contractValueRandMin  = useGameConfigStore((s) => s.config.contractValueRandMin);
  const contractValueRandMax  = useGameConfigStore((s) => s.config.contractValueRandMax);

  const releasePlayer = useSquadStore((s) => s.releasePlayer);
  const extendContract = useSquadStore((s) => s.extendContract);
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const clubBalance = useClubStore((s) => s.club.balance);
  const addBalance = useClubStore((s) => s.addBalance);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const analyticsUnlocked = useFacilityStore((s) => (s.levels['scouting_center'] ?? 0) > 0);
  const userClubName = useClubStore((s) => s.club.name ?? 'the club');
  const ampClubId   = useClubStore((s) => s.club.id);
  const ampClubName = useClubStore((s) => s.club.name ?? 'Academy');
  const worldClubs  = useWorldStore((s) => s.clubs);

  // Current club ID/name — AMP player uses the AMP club; NPC player found via worldStore
  const currentClubId = useMemo(() => {
    if (!isNpc) return ampClubId;
    for (const [cid, wc] of Object.entries(worldClubs)) {
      if (wc.players.some((p) => p.id === id)) return cid;
    }
    return '';
  }, [isNpc, ampClubId, worldClubs, id]);
  const currentClubName = isNpc ? (npcClubName ?? '') : ampClubName;
  const allGuardians = useGuardianStore((s) => s.guardians);
  const guardians = useMemo(
    () => allGuardians.filter((g) => g.playerId === id),
    [allGuardians, id],
  );

  // Transfer window
  const gameDate = useCalendarStore((s) => s.gameDate);
  const transferWindowOpen = isTransferWindowOpen(gameDate);

  // Contract metrics
  const weeksRemaining = player
    ? Math.max(0, (player.enrollmentEndWeek ?? 0) - weekNumber)
    : 0;
  const contractStatus =
    weeksRemaining >= 52 ? 'ACTIVE' :
    weeksRemaining >= 12 ? 'EXPIRING' :
    weeksRemaining > 0   ? 'CRITICAL' : 'NONE';
  const weeklyFee = Math.round((player?.wage ?? 0) / 100);

  // Contract progress bar — how much of the total term has elapsed
  const contractTotal = player
    ? Math.max(1, (player.enrollmentEndWeek ?? player.joinedWeek + 52) - player.joinedWeek)
    : 52;
  const contractElapsed = player ? Math.max(0, weekNumber - player.joinedWeek) : 0;
  const contractPct = Math.min(100, Math.round((contractElapsed / contractTotal) * 100));
  const contractBarColor =
    contractPct >= 85 ? WK.red :
    contractPct >= 60 ? WK.orange : WK.tealLight;

  // Contract extension cost: ability × rand(randMin, randMax) × playerMultiplier × 52 weeks
  const extensionCostPence = player
    ? calculateExtensionCost(
        player.overallRating ?? 0,
        52,
        wageMultiplierTiers,
        contractValueRandMin,
        contractValueRandMax,
      )
    : 0;
  const canAffordExtension = clubBalance >= extensionCostPence;

  const { data: playerAppearances, isLoading: appearancesLoading } = usePlayerAppearances(id ?? '');

  const [attrsExpanded, setAttrsExpanded]   = useState(false);
  const [matrixExpanded, setMatrixExpanded] = useState(false);
  const [releaseResultDialog, setReleaseResultDialog] = useState<{ title: string; message: string } | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm]   = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [lastAction, setLastAction] = useState<'SUPPORTED' | 'DISCIPLINED' | null>(null);

  const updatePlayer   = useSquadStore((s) => s.updatePlayer);
  const logInteraction = useInteractionStore((s) => s.logInteraction);
  const interactionRecords = useInteractionStore((s) => s.records);

  const managementCooldown = useMemo(() => {
    const last = interactionRecords
      .filter((r) => r.actorId === 'amp' && r.targetId === id && (r.subtype === 'support' || r.subtype === 'punish'))
      .sort((a, b) => b.week - a.week)[0];
    if (!last) return { locked: false, availableWeek: weekNumber };
    const availableWeek = last.week + 4;
    return { locked: weekNumber < availableWeek, availableWeek };
  }, [interactionRecords, id, weekNumber]);

  const recentInteractions = useMemo(
    () => interactionRecords
      .filter((r) => r.isVisibleToAmp && (r.actorId === id || r.targetId === id || r.secondaryTargetId === id))
      .slice(0, 5),
    [interactionRecords, id],
  );

  const gameDateObj = getGameDate(weekNumber);
  const displayAge  = player?.dateOfBirth
    ? computePlayerAge(player.dateOfBirth, gameDateObj)
    : (player?.age ?? '?');

  const radarSize = screenWidth - 32;

  if (!player) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>PLAYER NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const attrEntries = player.attributes
    ? (Object.entries(player.attributes) as [AttributeName, number][])
    : null;

  // Top 2 attributes for preview in collapsed header
  const topAttrs = attrEntries
    ? [...attrEntries].sort((a, b) => b[1] - a[1]).slice(0, 2)
    : null;

  const contractBorderColor =
    contractStatus === 'CRITICAL' ? WK.red :
    contractStatus === 'EXPIRING' ? WK.orange : WK.yellow;

  function handleSupport() {
    const p = player!;
    const moraleDelta = 5;
    updatePlayer(p.id, { morale: Math.min(100, (p.morale ?? 70) + moraleDelta) });
    logInteraction({
      week: weekNumber, actorType: 'amp', actorId: 'amp',
      targetType: 'player', targetId: p.id, category: 'AMP_PLAYER',
      subtype: 'support', relationshipDelta: 0, traitDeltas: {},
      moraleDelta, isVisibleToAmp: true, visibilityReason: 'direct_action',
      narrativeSummary: `You gave ${p.name} your support.`,
    });
    setLastAction('SUPPORTED');
    setTimeout(() => setLastAction(null), 2000);
  }

  function handlePunish() {
    const p = player!;
    const moraleDelta = -5;
    updatePlayer(p.id, { morale: Math.max(0, (p.morale ?? 70) + moraleDelta) });
    logInteraction({
      week: weekNumber, actorType: 'amp', actorId: 'amp',
      targetType: 'player', targetId: p.id, category: 'AMP_PLAYER',
      subtype: 'punish', relationshipDelta: 0, traitDeltas: {},
      moraleDelta, isVisibleToAmp: true, visibilityReason: 'direct_action',
      narrativeSummary: `You disciplined ${p.name}.`,
    });
    setLastAction('DISCIPLINED');
    setTimeout(() => setLastAction(null), 2000);
  }

  function handleExtend() {
    const newWeeklyWage = calculateWeeklyWage(
      player!.overallRating ?? 0,
      wageMultiplierTiers,
      contractValueRandMin,
      contractValueRandMax,
    );
    addBalance(-extensionCostPence);
    addTransaction({
      amount: -extensionCostPence,
      category: 'wages',
      description: `${player!.name} enrollment extension`,
      weekNumber,
    });
    extendContract(player!.id, newWeeklyWage);
    setShowExtendDialog(false);
  }

  async function confirmRelease() {
    if (!player) return;
    const result = await releasePlayer(player.id);
    if (result.success) {
      router.replace('/(tabs)/hub?tab=SQUAD');
    } else {
      setReleaseResultDialog({ title: 'Error', message: result.error ?? 'Failed to release player.' });
    }
  }

  function toggleNotForSale() {
    updatePlayer(player!.id, { notForSale: !player!.notForSale });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['top', 'bottom']}>
      <PitchBackground />

      {/* ── Screen header ───────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: isNpc ? (clubColors?.primary ?? WK.tealMid) : WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: isNpc ? (clubColors?.secondary ?? WK.border) : WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={20} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper style={{ flex: 1 }} numberOfLines={1}>
          {player.name} {isNpc && npcClubName ? `(${npcClubName})` : ''}
        </PixelText>
        <Badge label={`OVR ${player.overallRating}`} color="yellow" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* ── 1. Bio hero card ────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          ...pixelShadow,
        }}>
          <Avatar
            appearance={player.appearance}
            role="PLAYER"
            size={100}
            morale={player.morale ?? 70}
            age={player.age}
          />
          <View style={{ flex: 1 }}>
            <PixelText size={10} upper numberOfLines={2}>{player.name}</PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <FlagText nationality={player.nationality} size={13} />
              <BodyText size={13} dim>{player.nationality}</BodyText>
            </View>
            {/* Stats strip — position · age · morale */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge label={player.position} color="dim" />
              <Badge label={`AGE ${displayAge}`} color="dim" />
              {player.morale !== undefined && (
                <MoraleBar morale={player.morale} width={48} />
              )}
            </View>
          </View>
        </View>

        {/* ── 2. Injury card (conditional) ────────────────────────────────────── */}
        {player.injury && (() => {
          const { severity, weeksRemaining: injWk, injuredWeek } = player.injury!;
          const severityColor =
            severity === 'minor'    ? WK.yellow :
            severity === 'moderate' ? WK.orange  : WK.red;
          return (
            <View style={{
              backgroundColor: WK.tealCard, borderWidth: 3,
              borderColor: severityColor, padding: 14, ...pixelShadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <PixelText size={8} upper>Injury Status</PixelText>
                <View style={{ backgroundColor: severityColor, borderWidth: 2, borderColor: WK.border, paddingHorizontal: 6, paddingVertical: 3 }}>
                  <PixelText size={7} upper color={severity === 'minor' ? WK.border : WK.text}>{severity}</PixelText>
                </View>
              </View>
              <View style={{ borderTopWidth: 2, borderTopColor: WK.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                  <BodyText size={13} dim>RECOVERY</BodyText>
                  <PixelText size={8} color={severityColor}>{injWk}w remaining</PixelText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <BodyText size={13} dim>INJURED WK</BodyText>
                  <PixelText size={8} dim>Week {injuredWeek}</PixelText>
                </View>
              </View>
            </View>
          );
        })()}

        {/* ── 2.5 Transfer status — full width toggle ──────────────────────────── */}
        {!isNpc && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: player.notForSale ? WK.red : WK.border,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 8 }}>TRANSFER STATUS</PixelText>
            <BodyText size={12} dim style={{ marginBottom: 14 }}>
              When "Not for sale", other clubs will not submit transfer bids for this player.
            </BodyText>
            <Pressable
              onPress={toggleNotForSale}
              style={{
                backgroundColor: player.notForSale ? WK.red : WK.tealMid,
                borderWidth: 2,
                borderColor: player.notForSale ? WK.red : WK.border,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <PixelText size={9} color={WK.text}>
                {player.notForSale ? "NOT FOR SALE" : "MARK NOT FOR SALE"}
              </PixelText>
            </Pressable>
          </View>
        )}

        {/* ── 3. Attributes — collapsible with top-2 preview ──────────────────── */}
        {attrEntries && (
          <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, ...pixelShadow }}>
            <Pressable
              onPress={() => setAttrsExpanded((v) => !v)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}
            >
              <View style={{ flex: 1 }}>
                <PixelText size={8} upper>Attributes</PixelText>
                {!attrsExpanded && topAttrs && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    {topAttrs.map(([name, value]) => (
                      <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <BodyText size={11} dim>{ATTR_LABELS[name]}</BodyText>
                        <BodyText size={12} color={attrColor(value)}>{Math.round(value)}</BodyText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <PixelText size={8} color={WK.tealLight}>{attrsExpanded ? '▼' : '▶'}</PixelText>
            </Pressable>
            {attrsExpanded && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
                {attrEntries.map(([name, value]) => (
                  <AttributeBar key={name} name={name} value={value} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── 4. Ability Matrix — collapsible with trait dot strip preview ─────── */}
        <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, ...pixelShadow }}>
          <Pressable
            onPress={() => setMatrixExpanded((v) => !v)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}
          >
            <View style={{ flex: 1 }}>
              <PixelText size={8} upper>Ability Matrix</PixelText>
              {!matrixExpanded && (
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
                  {TRAIT_ORDER.map((trait) => (
                    <View
                      key={trait}
                      style={{
                        width: 12, height: 12,
                        backgroundColor: traitColor(player.personality[trait]),
                        borderWidth: 1, borderColor: WK.border,
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
            <PixelText size={8} color={WK.tealLight}>{matrixExpanded ? '▼' : '▶'}</PixelText>
          </Pressable>
          {matrixExpanded && player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center' }}>
              <AttributesRadar attributes={player.attributes} size={radarSize - 28} />
            </View>
          )}
          {matrixExpanded && !player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <BodyText size={13} dim>No attribute data yet.</BodyText>
            </View>
          )}
        </View>

        {/* ── 5. Development chart ─────────────────────────────────────────────── */}
        {(player.developmentLog?.length ?? 0) >= 3 && (
          <DevelopmentChart log={player.developmentLog!} />
        )}

        {/* ── 5b. Appearances ──────────────────────────────────────────────────── */}
        {playerAppearances && currentClubId && (
          <AppearancesCard
            appearances={playerAppearances}
            currentClubId={currentClubId}
            currentClubName={currentClubName}
            onViewHistory={() => router.push(`/appearances/${id}`)}
          />
        )}

        {/* ── 5c. Transfer History ──────────────────────────────────────────────── */}
        <TransferHistorySection
          playerId={id!}
          ampClubId={ampClubId}
          ampClubName={ampClubName}
          worldClubs={worldClubs}
        />

        {/* ── 6. Scout's Report ────────────────────────────────────────────────── */}
        <ScoutReportCard player={player} />

        {!isNpc && (
          <>
            <SectionDivider label="CLUB" />

            {/* ── 7. Guardians — with loyalty chips ───────────────────────────────── */}
            {guardians.length > 0 && (
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: WK.border, ...pixelShadow,
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
                  borderBottomWidth: 2, borderBottomColor: WK.border,
                }}>
                  <PixelText size={8} color={WK.yellow}>GUARDIANS</PixelText>
                  <BodyText size={12} dim>{guardians.length === 1 ? '1 GUARDIAN' : `${guardians.length} GUARDIANS`}</BodyText>
                </View>
                {guardians.map((g, i) => {
                  const chip = loyaltyChip(g.loyaltyToClub);
                  return (
                    <View key={g.id} style={{
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderBottomWidth: i < guardians.length - 1 ? 2 : 0,
                      borderBottomColor: WK.border,
                    }}>
                      {/* Name row + loyalty chip */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 3,
                          borderWidth: 2, borderColor: WK.border, backgroundColor: WK.tealDark,
                        }}>
                          <BodyText size={11} dim>{guardianLabel(g, guardians, i)}</BodyText>
                        </View>
                        <PixelText size={8}>{g.firstName} {g.lastName}</PixelText>
                        <Badge label={chip.label} color={chip.color} />
                      </View>
                      <View style={{ gap: 6 }}>
                        <BodyText size={13} style={{ lineHeight: 20 }}>
                          {getLoyaltyNote(g.loyaltyToClub, userClubName)}
                        </BodyText>
                        <BodyText size={12} dim style={{ lineHeight: 18 }}>
                          {getDemandNote(g.demandLevel)}
                        </BodyText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── 8. Scout accuracy report ─────────────────────────────────────────── */}
            {player.scoutingReport && (
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: WK.tealLight, padding: 14, ...pixelShadow,
              }}>
                <PixelText size={8} upper style={{ marginBottom: 10 }}>Scout Accuracy Report</PixelText>
                <BodyText size={13} dim style={{ marginBottom: 10 }}>
                  Scouted by {player.scoutingReport.scoutName} · {player.scoutingReport.accuracyPercent}% accurate
                </BodyText>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                    <BodyText size={13} dim>OVERALL RATING</BodyText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <PixelText size={8} color={WK.dim}>{player.scoutingReport.perceivedOverall}</PixelText>
                      <BodyText size={13} dim>→</BodyText>
                      <PixelText size={9} color={WK.green}>{player.scoutingReport.actualOverall}</PixelText>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                    <BodyText size={13} dim>POTENTIAL</BodyText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <PixelText size={8} color={WK.dim}>{player.scoutingReport.perceivedPotential}</PixelText>
                      <BodyText size={13} dim>→</BodyText>
                      <PixelText size={9} color={WK.green}>{player.scoutingReport.actualPotential}</PixelText>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ── 9. Social graph ──────────────────────────────────────────────────── */}
            {(player.relationships ?? []).length > 0 && (
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: WK.border, padding: 14, ...pixelShadow,
              }}>
                <PixelText size={8} upper style={{ marginBottom: 10 }}>Social Graph</PixelText>
                {(player.relationships ?? []).map((rel) => {
                  const name = (() => {
                    if (rel.type === 'coach') {
                      const c = require('@/stores/coachStore').useCoachStore.getState().coaches.find((x: { id: string }) => x.id === rel.id);
                      return c ? `${c.name} (Coach)` : 'Unknown Coach';
                    }
                    if (rel.type === 'scout') {
                      const s = require('@/stores/scoutStore').useScoutStore.getState().scouts.find((x: { id: string }) => x.id === rel.id);
                      return s ? `${s.name} (Scout)` : 'Unknown Scout';
                    }
                    const p = require('@/stores/squadStore').useSquadStore.getState().players.find((x: { id: string }) => x.id === rel.id);
                    return p ? p.name : 'Unknown Player';
                  })();
                  const isPositive = rel.value >= 0;
                  return (
                    <View key={rel.id} style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border,
                    }}>
                      <BodyText size={13} style={{ flex: 1 }} numberOfLines={1}>{name}</BodyText>
                      <BodyText size={13} color={isPositive ? WK.green : WK.red}>
                        {isPositive ? `TRUST +${rel.value}` : `CONFLICT ${rel.value}`}
                      </BodyText>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── 10. Assigned coach ───────────────────────────────────────────────── */}
            {player.assignedCoachId && (() => {
              const assignedCoach = require('@/stores/coachStore').useCoachStore.getState().coaches.find(
                (c: { id: string }) => c.id === player.assignedCoachId,
              );
              if (!assignedCoach) return null;
              const bond = (player.relationships ?? []).find((r) => r.id === assignedCoach.id);
              return (
                <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
                  <PixelText size={8} upper style={{ marginBottom: 8 }}>Assigned Coach</PixelText>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <PixelText size={8}>{assignedCoach.name}</PixelText>
                      <BodyText size={12} dim>{assignedCoach.role}</BodyText>
                    </View>
                    {bond && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <PixelText size={8} color={bond.value >= 0 ? WK.green : WK.red}>
                          {bond.value >= 0 ? `+${bond.value}` : `${bond.value}`}
                        </PixelText>
                        <BodyText size={11} dim>
                          {bond.value >= 0 ? `+${Math.round(bond.value / 2)}% XP` : `${Math.round(bond.value / 2)}% XP`}
                        </BodyText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* ── 11. Enrollment contract — with progress bar ──────────────────────── */}
            <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: contractBorderColor, padding: 14, ...pixelShadow,
              }}>
                <PixelText size={8} upper style={{ marginBottom: 10 }}>Enrollment Contract</PixelText>

                {/* Status badge + weeks remaining */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 4,
                    backgroundColor:
                      contractStatus === 'ACTIVE'   ? WK.green :
                      contractStatus === 'EXPIRING' ? WK.orange : WK.red,
                  }}>
                    <PixelText size={7} color={WK.text}>{contractStatus}</PixelText>
                  </View>
                  <BodyText size={13} dim>{weeksRemaining}w remaining</BodyText>
                </View>

                {/* Contract elapsed progress bar */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                    <View style={{ height: '100%', width: `${contractPct}%`, backgroundColor: contractBarColor }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <BodyText size={11} dim>CONTRACT ELAPSED</BodyText>
                    <BodyText size={11} dim>{contractPct}%</BodyText>
                  </View>
                </View>

                <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 10, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <BodyText size={13} dim>WEEKLY FEE</BodyText>
                    <Money pence={player.wage ?? 0} size={8} color={WK.tealLight} />
                  </View>
                  {player.morale !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <BodyText size={13} dim>MORALE</BodyText>
                      <MoraleBar morale={player.morale} width={80} />
                    </View>
                  )}
                  {(player.extensionCount ?? 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <BodyText size={13} dim>EXTENSIONS</BodyText>
                      <PixelText size={8} color={WK.dim}>{player.extensionCount}</PixelText>
                    </View>
                  )}
                </View>

                {/* Extension button — visible when EXPIRING or CRITICAL */}
                {(contractStatus === 'EXPIRING' || contractStatus === 'CRITICAL') && (
                  <Pressable
                    onPress={() => setShowExtendDialog(true)}
                    style={{
                      marginTop: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: canAffordExtension ? WK.tealMid : 'rgba(0,0,0,0.3)',
                      borderWidth: 2,
                      borderColor: canAffordExtension ? WK.tealLight : WK.dim,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <PixelText size={8} color={canAffordExtension ? WK.tealLight : WK.dim}>
                        EXTEND CONTRACT
                      </PixelText>
                      <Money pence={extensionCostPence} size={8} color={canAffordExtension ? WK.tealLight : WK.dim} />
                    </View>
                  </Pressable>
                )}
            </View>

            {/* ── 12. Recent interactions — hidden when empty ──────────────────────── */}
            {recentInteractions.length > 0 && (
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: WK.border, padding: 14, ...pixelShadow,
              }}>
                <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>RECENT INTERACTIONS</PixelText>
                {recentInteractions.map((record) => (
                  <View key={record.id} style={{
                    flexDirection: 'row', gap: 8, paddingVertical: 6,
                    borderBottomWidth: 2, borderBottomColor: WK.border, alignItems: 'flex-start',
                  }}>
                    <PixelText size={8} color={WK.yellow} style={{ minWidth: 42 }}>WK {record.week}</PixelText>
                    <BodyText size={12} dim style={{ flex: 1, lineHeight: 16 }}>{record.narrativeSummary}</BodyText>
                  </View>
                ))}
              </View>
            )}

            {/* ── Debug: Personality Matrix ── */}
            {debugEnabled && (
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3,
                borderColor: WK.yellow, padding: 14, ...pixelShadow,
              }}>
                <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>PERSONALITY MATRIX (DEBUG)</PixelText>
                <View style={{ backgroundColor: WK.tealDark, borderWidth: 1, borderColor: WK.border, padding: 10 }}>
                  <BodyText size={11} color={WK.text} style={{ fontFamily: 'monospace', lineHeight: 18 }}>
                    {JSON.stringify(player.personality, null, 2)}
                  </BodyText>
                </View>
              </View>
            )}

            {/* ── 13. Release player ───────────────────────────────────────────── */}
            <View style={{ borderWidth: 3, borderColor: transferWindowOpen ? WK.red : WK.border, padding: 14, marginTop: 6 }}>
              <PixelText size={8} color={transferWindowOpen ? WK.red : WK.dim} style={{ marginBottom: 8 }}>RELEASE PLAYER</PixelText>
              {transferWindowOpen ? (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 14 }}>
                    Return {player.name} to the market pool. No transfer fee received.
                  </BodyText>
                  <Pressable
                    onPress={() => setShowReleaseConfirm(true)}
                    style={{
                      backgroundColor: WK.red,
                      borderWidth: 3,
                      borderColor: WK.border,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <PixelText size={8} color={WK.text}>RELEASE PLAYER</PixelText>
                  </Pressable>
                </>
              ) : (
                <View style={{ borderWidth: 2, borderColor: WK.border, padding: 10, alignItems: 'center', gap: 4 }}>
                  <PixelText size={7} dim upper>TRANSFER WINDOW CLOSED</PixelText>
                  <PixelText size={6} dim>{`Window reopens ${getNextTransferWindowDate(gameDate)}`}</PixelText>
                </View>
              )}
            </View>
          </>
        )}

        {/* Spacer so last card clears the sticky management bar */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Sticky Management Bar ───────────────────────────────────────────── */}
      {!isNpc && (
        <View style={{
          backgroundColor: WK.tealDark,
          borderTopWidth: 3,
          borderTopColor: WK.border,
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 12,
          gap: 8,
        }}>
          {/* Feedback / cooldown notice */}
          {(lastAction || managementCooldown.locked) && (
            <View style={{ alignItems: 'center' }}>
              {lastAction ? (
                <View style={{
                  paddingVertical: 4, paddingHorizontal: 12,
                  borderWidth: 2,
                  borderColor: lastAction === 'SUPPORTED' ? WK.green : WK.red,
                }}>
                  <PixelText size={7} color={lastAction === 'SUPPORTED' ? WK.green : WK.red}>
                    ✓ {lastAction}
                  </PixelText>
                </View>
              ) : (
                <BodyText size={12} dim>AVAILABLE WK {managementCooldown.availableWeek}</BodyText>
              )}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={managementCooldown.locked ? undefined : handleSupport}
              style={{
                flex: 1,
                backgroundColor: managementCooldown.locked ? WK.tealMid : WK.green,
                borderWidth: 2, borderColor: WK.border,
                paddingVertical: 14, alignItems: 'center',
                opacity: managementCooldown.locked ? 0.45 : 1,
              }}
            >
              <PixelText size={9} color={managementCooldown.locked ? WK.dim : WK.text}>SUPPORT</PixelText>
            </Pressable>
            <Pressable
              onPress={managementCooldown.locked ? undefined : handlePunish}
              style={{
                flex: 1,
                backgroundColor: managementCooldown.locked ? WK.tealMid : WK.red,
                borderWidth: 2, borderColor: WK.border,
                paddingVertical: 14, alignItems: 'center',
                opacity: managementCooldown.locked ? 0.45 : 1,
              }}
            >
              <PixelText size={9} color={managementCooldown.locked ? WK.dim : WK.text}>PUNISH</PixelText>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Contract extension dialog ────────────────────────────────────────── */}
      <PixelDialog
        visible={showExtendDialog}
        title="Extend Enrollment?"
        message={
          canAffordExtension
            ? `Extend ${player?.name}'s enrollment by 52 weeks for £${Math.round(extensionCostPence / 100).toLocaleString()}.`
            : `You cannot afford this extension. You need £${Math.round(extensionCostPence / 100).toLocaleString()} but your balance is insufficient.`
        }
        onClose={() => setShowExtendDialog(false)}
        {...(canAffordExtension ? { onConfirm: handleExtend, confirmLabel: 'EXTEND' } : {})}
      />

      {/* ── Release confirmation dialog ─────────────────────────────────────── */}
      <PixelDialog
        visible={showReleaseConfirm}
        title="Release Player?"
        message={`${player?.name} will be returned to the market pool. This cannot be undone and no transfer fee is received.`}
        onClose={() => setShowReleaseConfirm(false)}
        onConfirm={() => { setShowReleaseConfirm(false); confirmRelease(); }}
        confirmLabel="RELEASE"
      />

      {/* ── Release result dialog ───────────────────────────────────────────── */}
      <PixelDialog
        visible={!!releaseResultDialog}
        title={releaseResultDialog?.title ?? ''}
        message={releaseResultDialog?.message ?? ''}
        onClose={() => {
          const wasSuccess = releaseResultDialog?.title === 'Player Released';
          setReleaseResultDialog(null);
          if (wasSuccess) router.replace('/(tabs)/hub?tab=SQUAD');
        }}
      />
    </SafeAreaView>
  );
}
