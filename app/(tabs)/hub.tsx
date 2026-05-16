import { useState, useMemo, useEffect } from 'react';
import { View, FlatList, ScrollView, Modal, Pressable, TextInput } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { FAB_CLEARANCE } from './_layout';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { useClubStore } from '@/stores/clubStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { calculateMatchdayIncome, calculateStandIncome } from '@/utils/matchdayIncome';
import { calculateStaffSeverance, calculateStaffSignOnFee } from '@/engine/finance';
import { useMarketStore } from '@/stores/marketStore';
import type { MarketCoach, MarketScout } from '@/types/market';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { SortableTable } from '@/components/ui/SortableTable';
import type { ColumnDef } from '@/components/ui/SortableTable';
import { PixelText, BodyText, VT323Text } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { useInteractionStore } from '@/stores/interactionStore';
import { CLIQUE_PALETTE, NO_GROUP_COLOR } from '@/types/interaction';
import type { Clique } from '@/types/interaction';
import { Avatar } from '@/components/ui/Avatar';
import { MoraleArrow } from '@/components/ui/MoraleArrow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { Money } from '@/components/ui/Money';
import { hapticTap, hapticWarning } from '@/utils/haptics';
import { penceToPounds } from '@/utils/currency';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { Scout } from '@/types/market';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { PerformancePane } from '@/components/PerformancePane';
import { TIER_ORDER } from '@/types/club';
import type { ClubTier } from '@/types/club';

const CLUB_TABS = ['SQUAD', 'STAFF', 'PERFORMANCE', 'DRESSING ROOM'] as const;

const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
] as const;
type ClubTab = typeof CLUB_TABS[number];

// ─── Player card ──────────────────────────────────────────────────────────────

function injuryStyle(player: Player): { borderColor: string; backgroundColor: string } {
  if (!player.injury) return { borderColor: WK.border, backgroundColor: WK.tealCard };
  switch (player.injury.severity) {
    case 'minor':    return { borderColor: WK.yellow, backgroundColor: WK.yellow + '26' };
    case 'moderate': return { borderColor: WK.orange,  backgroundColor: WK.orange  + '26' };
    case 'serious':  return { borderColor: WK.red,     backgroundColor: WK.red     + '26' };
  }
}

function injuryBadgeLabel(player: Player): string | null {
  if (!player.injury) return null;
  const abbrev = player.injury.severity === 'minor' ? 'MINOR' : player.injury.severity === 'moderate' ? 'MOD' : 'SERIOUS';
  return `${abbrev} ${player.injury.weeksRemaining}W`;
}

function PlayerRow({ player }: { player: Player }) {
  const router = useRouter();
  const cliques = useInteractionStore((s) => s.cliques);
  const playerClique = cliques.find((c) => c.isDetected && c.memberIds.includes(player.id));
  const cliqueColor = playerClique ? CLIQUE_PALETTE[playerClique.color] : NO_GROUP_COLOR;
  const cardStyle = injuryStyle(player);
  const badgeLabel = injuryBadgeLabel(player);

  const traitValues = [
    player.personality.determination,
    player.personality.professionalism,
    player.personality.ambition,
    player.personality.loyalty,
    player.personality.adaptability,
    player.personality.pressure,
    player.personality.temperament,
    player.personality.consistency,
  ];

  return (
    <Pressable onPress={() => { hapticTap(); router.push(`/player/${player.id}`); }}>
      <View style={{
        backgroundColor: cardStyle.backgroundColor,
        borderWidth: 3,
        borderColor: cardStyle.borderColor,
        padding: 10,
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: player.notForSale ? 0.5 : 1,
        ...pixelShadow,
      }}>
        {/* Avatar */}
        <Avatar appearance={player.appearance} role="PLAYER" size={44} morale={player.morale ?? 70} age={player.age} />

        {/* Main content */}
        <View style={{ flex: 1 }}>
          {/* Name + injury badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <BodyText size={14} upper numberOfLines={1} style={{ flex: 1 }}>{player.name}</BodyText>
            {badgeLabel && (
              <View style={{ backgroundColor: cardStyle.borderColor, borderWidth: 1, borderColor: WK.border, paddingHorizontal: 5, paddingVertical: 2 }}>
                <PixelText size={7} color={WK.text}>{badgeLabel}</PixelText>
              </View>
            )}
          </View>

          {/* Position · Age · Archetype */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <BodyText size={12} color={WK.tealLight}>{player.position} · {player.age}</BodyText>
            <ArchetypeBadge player={player} />
          </View>

          {/* Flag + Nationality */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
            <FlagText nationality={player.nationality} size={11} />
            <BodyText size={11} dim numberOfLines={1} style={{ flex: 1 }}>{player.nationality}</BodyText>
          </View>

          {/* 8 trait dots — single row */}
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {traitValues.map((v, i) => (
              <View key={i} style={{ width: 10, height: 10, backgroundColor: traitColor(v), borderWidth: 1, borderColor: WK.border }} />
            ))}
          </View>

          {/* Clique — only shown if in a group */}
          {playerClique && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: cliqueColor, borderWidth: 1, borderColor: WK.border }} />
              <BodyText size={11} color={cliqueColor} numberOfLines={1}>{playerClique.name.toUpperCase()}</BodyText>
            </View>
          )}
        </View>

        {/* Rating badge */}
        <Badge label={`${player.overallRating}`} color="yellow" />
      </View>
    </Pressable>
  );
}

// ─── Coach cards ──────────────────────────────────────────────────────────────

function CoachRow({ coach, weekNumber, onFire, onRenew }: { coach: Coach; weekNumber: number; onFire: () => void; onRenew: () => void }) {
  const debugEnabled = useGameConfigStore((s) => s.config.debugLoggingEnabled);

  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...pixelShadow,
      }}>
        {/* Avatar */}
        <Avatar appearance={coach.appearance} role="COACH" size={44} morale={coach.morale ?? 70} age={35} />

        {/* Main content */}
        <View style={{ flex: 1 }}>
          <BodyText size={14} upper numberOfLines={1} style={{ marginBottom: 3 }}>{coach.name}</BodyText>
          <PixelText size={8} color={WK.tealLight} style={{ marginBottom: 3 }}>{formatStaffRole(coach.role).toUpperCase()}</PixelText>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
            <FlagText nationality={coach.nationality} size={11} />
            <BodyText size={11} dim numberOfLines={1} style={{ flex: 1 }}>{coach.nationality}</BodyText>
            <BodyText size={11} dim style={{ flexShrink: 0 }}>· </BodyText>
            <Money pence={coach.salary} dim size={11} />
            <BodyText size={11} dim style={{ flexShrink: 0 }}>/wk</BodyText>
          </View>
 
          {/* Influence bar */}
          {/* <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border, marginBottom: 5 }}>
            <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
          </View>  */}

          {/* Specialism chips */}
          {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              {(Object.entries(coach.specialisms) as [string, number][]).map(([attr]) => (
                <View key={attr} style={{ paddingHorizontal: 5, paddingVertical: 2, backgroundColor: WK.tealDark, borderWidth: 1, borderColor: WK.yellow }}>
                  <PixelText size={7} color={WK.yellow}>{attr.toUpperCase()}</PixelText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right: badge + contract + actions */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          {coach.contractEndWeek !== undefined && (() => {
            const wks = Math.max(0, coach.contractEndWeek - weekNumber);
            const color = wks <= 4 ? WK.red : wks <= 12 ? WK.orange : WK.green;
            return <PixelText size={6} color={color}>{wks}WK LEFT</PixelText>;
          })()}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => { hapticWarning(); onRenew(); }} hitSlop={10}>
              <PixelText size={7} color={WK.yellow}>RENEW</PixelText>
            </Pressable>
            <Pressable onPress={() => { hapticWarning(); onFire(); }} hitSlop={10}>
              <PixelText size={7} color={WK.red}>RELEASE</PixelText>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Debug: Personality Matrix */}
      {debugEnabled && (
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: WK.yellow,
          marginTop: -3,
          padding: 8,
          zIndex: -1,
        }}>
          <PixelText size={6} color={WK.yellow} style={{ marginBottom: 4 }}>PERSONALITY MATRIX</PixelText>
          <BodyText size={9} color={WK.text} style={{ fontFamily: 'monospace' }}>
            {JSON.stringify(coach.personality, null, 2)}
          </BodyText>
        </View>
      )}
    </View>
  );
}

// ─── Scout Row ──────────────────────────────────────────────────────────────

const RANGE_LABEL: Record<Scout['scoutingRange'], string> = {
  local: 'LOCAL',
  national: 'NATIONAL',
  international: 'INTL',
};

function ScoutRow({ scout, weekNumber, onRenew, onRelease }: { scout: Scout; weekNumber: number; onRenew: () => void; onRelease: () => void }) {
  const router = useRouter();
  const isOnMission  = scout.activeMission?.status === 'active';
  const dofAutoScouts = useCoachStore(
    (s) => s.coaches.find((c) => c.role === 'director_of_football')?.dofAutoAssignScouts ?? false,
  );
  const debugEnabled = useGameConfigStore((s) => s.config.debugLoggingEnabled);

  const borderColor = isOnMission ? WK.orange : dofAutoScouts ? WK.tealLight : WK.border;

  return (
    <View style={{ marginBottom: 6 }}>
      <Pressable onPress={() => { hapticTap(); router.push(`/scout/${scout.id}`); }}>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor,
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          ...pixelShadow,
        }}>
          {/* Avatar */}
          <Avatar appearance={scout.appearance} role="SCOUT" size={44} morale={scout.morale ?? 70} />

          {/* Main content */}
          <View style={{ flex: 1 }}>
            {/* Name + status badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <BodyText size={14} upper numberOfLines={1} style={{ flex: 1 }}>{scout.name}</BodyText>
              {isOnMission && <Badge label="ACTIVE" color="yellow" />}
              {!isOnMission && dofAutoScouts && <Badge label="DOF MANAGED" color="green" />}
            </View>

            <PixelText size={8} color={WK.tealLight} style={{ marginBottom: 3 }}>{RANGE_LABEL[scout.scoutingRange]} {formatStaffRole(scout.role).toUpperCase()}</PixelText>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <FlagText nationality={scout.nationality} size={11} />
              <BodyText size={11} dim numberOfLines={1} style={{ flex: 1 }}>{scout.nationality}</BodyText>
              <BodyText size={11} dim style={{ flexShrink: 0 }}>· </BodyText>
              <Money pence={scout.salary} dim size={11} />
              <BodyText size={11} dim style={{ flexShrink: 0 }}>/wk</BodyText>
            </View>

            {/* Success rate bar */}
            <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
              <View style={{ height: '100%', width: `${scout.successRate}%`, backgroundColor: traitColor(Math.round(scout.successRate / 5)) }} />
            </View>
          </View>

          {/* Success rate badge */}
          <Badge label={`${scout.successRate}%`} color="yellow" />
        </View>
      </Pressable>

      {/* Contract status + actions */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3,
        borderColor: isOnMission ? WK.orange : dofAutoScouts ? WK.tealLight : WK.border,
        paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {scout.contractEndWeek !== undefined ? (() => {
          const wks = Math.max(0, scout.contractEndWeek - weekNumber);
          const color = wks <= 4 ? WK.red : wks <= 12 ? WK.orange : WK.green;
          return <PixelText size={6} color={color}>CONTRACT: {wks} WKS</PixelText>;
        })() : <View />}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => { hapticWarning(); onRenew(); }} hitSlop={8}>
            <PixelText size={7} color={WK.yellow}>RENEW</PixelText>
          </Pressable>
          <Pressable onPress={() => { hapticWarning(); onRelease(); }} hitSlop={8}>
            <PixelText size={7} color={WK.red}>RELEASE</PixelText>
          </Pressable>
        </View>
      </View>

      {/* Debug: Personality Matrix */}
      {debugEnabled && (scout as any).personality && (
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: WK.yellow,
          marginTop: -3,
          padding: 8,
          zIndex: -1,
        }}>
          <PixelText size={6} color={WK.yellow} style={{ marginBottom: 4 }}>PERSONALITY MATRIX</PixelText>
          <BodyText size={9} color={WK.text} style={{ fontFamily: 'monospace' }}>
            {JSON.stringify((scout as any).personality, null, 2)}
          </BodyText>
        </View>
      )}
    </View>
  );
}

// ─── Panes ────────────────────────────────────────────────────────────────────

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

const POSITION_FILTERS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const;
type PositionFilter = typeof POSITION_FILTERS[number];

function SquadPane() {
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const allPlayers = useSquadStore((s) => s.players);
  const router = useRouter();

  const players = allPlayers.filter(
    (p) => p.isActive && (posFilter === 'ALL' || p.position === posFilter),
  );

  const PLAYER_COLS: ColumnDef<typeof players[number]>[] = [
    {
      key: 'position',
      label: 'POS',
      flex: 1,
      sortValue: (p) => p.position,
      render: (p) => (
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 1,
          borderColor: WK.border,
          paddingHorizontal: 4,
          paddingVertical: 2,
          alignItems: 'center',
        }}>
          <PixelText size={8} color={WK.tealLight}>{p.position}</PixelText>
        </View>
      ),
    },
    {
      key: 'name',
      label: 'NAME',
      flex: 2.5,
      sortValue: (p) => p.name,
      render: (p) => (
        <BodyText size={13} upper numberOfLines={1} style={{ flex: 1 }}>{shortName(p.name)}</BodyText>
      ),
    },
    {
      key: 'nationality',
      label: 'NAT',
      flex: 1,
      align: 'center',
      sortValue: (p) => p.nationality,
      render: (p) => <FlagText nationality={p.nationality} size={16} />,
    },
    {
      key: 'age',
      label: 'AGE',
      flex: 1,
      align: 'center',
      sortValue: (p) => p.age,
      render: (p) => <PixelText size={9} color={WK.dim}>{p.age}</PixelText>,
    },
    {
      key: 'morale',
      label: 'MOR',
      flex: 1,
      align: 'center',
      sortValue: (p) => p.morale ?? 50,
      render: (p) => <MoraleArrow morale={p.morale ?? 50} size={20} />,
    },
    {
      key: 'overallRating',
      label: 'OVR',
      flex: 1,
      align: 'center',
      sortValue: (p) => p.overallRating,
      render: (p) => <Badge label={String(p.overallRating)} color="yellow" />,
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Position filter bar */}
      <View style={{
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        {POSITION_FILTERS.map((pos) => {
          const active = posFilter === pos;
          return (
            <Pressable
              key={pos}
              onPress={() => { hapticTap(); setPosFilter(pos); }}
              style={{
                flex: 1,
                paddingVertical: 10,
                backgroundColor: active ? WK.yellow : WK.tealCard,
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
                alignItems: 'center',
              }}
            >
              <PixelText size={8} color={active ? WK.border : WK.dim}>{pos}</PixelText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}>
        <SortableTable
          columns={PLAYER_COLS}
          data={players}
          defaultSortKey="overallRating"
          defaultSortDir="desc"
          onRowPress={(p) => { hapticTap(); router.push(`/player/${p.id}`); }}
          emptyMessage="NO PLAYERS"
          rowStyle={(p) => ({
            ...(p.injury ? injuryStyle(p) : {}),
            opacity: p.notForSale ? 0.5 : 1,
          })}
        />
      </ScrollView>
    </View>
  );
}

// ─── Staff Pane ──────────────────────────────────────────────────────────────


function formatStaffRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type StaffRoleFilter = 'ALL' | import('@/types/coach').StaffRole;

function StaffPane() {
  const { coaches, removeCoach, updateCoach } = useCoachStore();
  const { scouts, removeScout, updateScout } = useScoutStore();
  const { club, addBalance } = useClubStore();
  const router = useRouter();
  const weekNumber = club.weekNumber ?? 1;

  const config = useGameConfigStore((s) => s.config);
  const STAFF_FILTER_OPTIONS: StaffRoleFilter[] = ['ALL', 'coach', 'assistant_coach', 'scout'];

  const [filterRole, setFilterRole] = useState<StaffRoleFilter>('ALL');
  const [showFilter, setShowFilter] = useState(false);
  const [pendingFireCoach, setPendingFireCoach] = useState<{
    coach: Coach;
    penalty: number;
    penaltyPence: number;
  } | null>(null);
  const [pendingFireScout, setPendingFireScout] = useState<{ scout: Scout; severancePence: number } | null>(null);
  const [pendingRenew, setPendingRenew] = useState<{ kind: 'coach'; data: Coach } | { kind: 'scout'; data: Scout } | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const COACHING_ROLES = new Set<string>(['coach', 'assistant_coach']);

  type HiredStaffItem =
    | { kind: 'coach'; data: Coach }
    | { kind: 'scout'; data: Scout };

  const allStaff: HiredStaffItem[] = [
    ...coaches
      .filter((c) => COACHING_ROLES.has(c.role))
      .map((c) => ({ kind: 'coach' as const, data: c })),
    ...scouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered =
    filterRole === 'ALL'
      ? allStaff
      : allStaff.filter((item) => {
          return item.data.role === filterRole;
        });

  function fireCoach(coach: Coach) {
    const weeksRemaining = Math.max(0, (coach.contractEndWeek ?? weekNumber) - weekNumber);
    const severancePence = calculateStaffSeverance(coach.salary, weeksRemaining, config.staffSeverancePercent);
    setFireError(null);
    setPendingFireCoach({ coach, penalty: Math.round(severancePence / 100), penaltyPence: severancePence });
  }

  function confirmFireCoach() {
    if (!pendingFireCoach) return;
    const { coach, penaltyPence } = pendingFireCoach;
    if ((club.balance ?? 0) < penaltyPence) {
      setFireError(`INSUFFICIENT FUNDS — need £${Math.round(penaltyPence / 100).toLocaleString()}`);
      setPendingFireCoach(null);
      return;
    }
    if (penaltyPence > 0) {
      addBalance(-penaltyPence);
      useFinanceStore.getState().addTransaction({
        amount: -penaltyPence,
        category: 'staff_severance',
        description: `Released ${coach.name}`,
        weekNumber,
      });
    }
    removeCoach(coach.id);
    setPendingFireCoach(null);
  }

  function fireScout(scout: Scout) {
    const weeksRemaining = Math.max(0, (scout.contractEndWeek ?? weekNumber) - weekNumber);
    const severancePence = calculateStaffSeverance(scout.salary, weeksRemaining, config.staffSeverancePercent);
    setPendingFireScout({ scout, severancePence });
  }

  function confirmFireScout() {
    if (!pendingFireScout) return;
    const { scout, severancePence } = pendingFireScout;
    if ((club.balance ?? 0) < severancePence) {
      setFireError(`INSUFFICIENT FUNDS — need £${Math.round(severancePence / 100).toLocaleString()}`);
      setPendingFireScout(null);
      return;
    }
    if (severancePence > 0) {
      addBalance(-severancePence);
      useFinanceStore.getState().addTransaction({
        amount: -severancePence,
        category: 'staff_severance',
        description: `Released ${scout.name}`,
        weekNumber,
      });
    }
    removeScout(scout.id);
    setPendingFireScout(null);
  }

  function renewStaff(durationWeeks: number) {
    if (!pendingRenew) return;
    const salary = pendingRenew.data.salary;
    const fee = calculateStaffSignOnFee(salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < fee) {
      setRenewError(`INSUFFICIENT FUNDS — need £${Math.round(fee / 100).toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    useFinanceStore.getState().addTransaction({
      amount: -fee,
      category: 'staff_sign_on',
      description: `Renewed ${pendingRenew.data.name}'s contract (${durationWeeks / 52} yr)`,
      weekNumber,
    });
    if (pendingRenew.kind === 'coach') {
      updateCoach(pendingRenew.data.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    } else {
      updateScout(pendingRenew.data.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    }
    setPendingRenew(null);
    setRenewError(null);
  }

  const totalWeeklyCost = coaches.reduce((s, c) => s + c.salary, 0) +
    scouts.reduce((s, sc) => s + sc.salary, 0);

  return (
    <View style={{ flex: 1 }}>
      {/* Stats bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        <BodyText size={11} dim>
          {coaches.length} COACH{coaches.length !== 1 ? 'ES' : ''} · {scouts.length} SCOUT{scouts.length !== 1 ? 'S' : ''}
        </BodyText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Money pence={totalWeeklyCost} dim size={11} />
          <BodyText size={11} dim>/wk</BodyText>
          <Pressable
            onPress={() => { hapticTap(); setShowFilter(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <SlidersHorizontal size={14} color={filterRole !== 'ALL' ? WK.yellow : WK.dim} />
            <PixelText size={7} color={filterRole !== 'ALL' ? WK.yellow : WK.dim}>FILTER</PixelText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        renderItem={({ item }) =>
          item.kind === 'coach'
            ? <CoachRow coach={item.data} weekNumber={weekNumber} onFire={() => fireCoach(item.data)} onRenew={() => setPendingRenew({ kind: 'coach', data: item.data })} />
            : <ScoutRow scout={item.data} weekNumber={weekNumber} onRenew={() => setPendingRenew({ kind: 'scout', data: item.data })} onRelease={() => fireScout(item.data)} />
        }
        ListEmptyComponent={
          <BodyText size={12} dim style={{ textAlign: 'center', marginTop: 32 }}>
            NO STAFF — HIRE FROM OFFICE
          </BodyText>
        }
      />

      {/* Filter overlay */}
      <Modal visible={showFilter} transparent animationType="fade" onRequestClose={() => setShowFilter(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
          onPress={() => setShowFilter(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderTopWidth: 3,
              borderTopColor: WK.border,
              padding: 16,
              paddingBottom: 32,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <PixelText size={9} upper>FILTER BY TYPE</PixelText>
                <Pressable onPress={() => setShowFilter(false)}>
                  <PixelText size={9} color={WK.dim}>✕</PixelText>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STAFF_FILTER_OPTIONS.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => { hapticTap(); setFilterRole(role); setShowFilter(false); }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: filterRole === role ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: filterRole === role ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={7} color={filterRole === role ? WK.border : WK.text}>
                      {formatStaffRole(role)}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Coach fire confirmation */}
      {pendingFireCoach && (
        <PixelDialog
          visible
          title="RELEASE STAFF"
          message={(
            <View style={{ gap: 8 }}>
              <PixelText size={7} dim>{`Release ${pendingFireCoach.coach.name}?`}</PixelText>
              {pendingFireCoach.penaltyPence > 0 ? (
                <>
                  <PixelText size={7} dim>Severance payout:</PixelText>
                  <Money pence={pendingFireCoach.penaltyPence} size={12} />
                </>
              ) : (
                <PixelText size={7} dim>No severance — contract already expired.</PixelText>
              )}
            </View>
          )}
          confirmLabel="RELEASE"
          confirmVariant="red"
          onConfirm={confirmFireCoach}
          onClose={() => setPendingFireCoach(null)}
        />
      )}

      {/* Scout fire confirmation */}
      {pendingFireScout && (
        <PixelDialog
          visible
          title="RELEASE SCOUT"
          message={(
            <View style={{ gap: 8 }}>
              <PixelText size={7} dim>{`Release ${pendingFireScout.scout.name}?`}</PixelText>
              {pendingFireScout.severancePence > 0 ? (
                <>
                  <PixelText size={7} dim>Severance payout:</PixelText>
                  <Money pence={pendingFireScout.severancePence} size={12} />
                </>
              ) : (
                <PixelText size={7} dim>No severance — contract already expired.</PixelText>
              )}
            </View>
          )}
          confirmLabel="RELEASE"
          confirmVariant="red"
          onConfirm={confirmFireScout}
          onClose={() => setPendingFireScout(null)}
        />
      )}

      {/* Renew modal */}
      <Modal visible={!!pendingRenew} transparent animationType="fade" onRequestClose={() => { setPendingRenew(null); setRenewError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setPendingRenew(null); setRenewError(null); }}>
          <Pressable onPress={() => {}} style={{ width: '90%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Renew Contract</PixelText>
              {pendingRenew && (
                <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{pendingRenew.data.name}</PixelText>
              )}
              {renewError && (
                <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{renewError}</PixelText>
              )}
              <View style={{ gap: 8 }}>
                {pendingRenew && DURATION_OPTIONS.map((opt) => {
                  const fee = calculateStaffSignOnFee(pendingRenew.data.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
                  return (
                    <Button
                      key={opt.weeks}
                      label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`}
                      variant="yellow"
                      fullWidth
                      onPress={() => renewStaff(opt.weeks)}
                    />
                  );
                })}
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setPendingRenew(null); setRenewError(null); }} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {fireError && (
        <PixelDialog
          visible
          title="ERROR"
          message={fireError}
          onConfirm={() => setFireError(null)}
          onClose={() => setFireError(null)}
        />
      )}
    </View>
  );
}

// ─── Performance Pane ────────────────────────────────────────────────────────

// Moved to src/components/PerformancePane.tsx

// ─── Dressing Room ────────────────────────────────────────────────────────────

function handleGroupSession(targetType: 'squad' | 'staff'): void {
  const weekNumber = useClubStore.getState().club.weekNumber ?? 1;
  const moraleDelta = 8;

  if (targetType === 'squad') {
    useSquadStore.getState().players
      .filter((p) => p.isActive)
      .forEach((p) => useSquadStore.getState().updateMorale(p.id, moraleDelta));
  } else {
    useCoachStore.getState().coaches
      .forEach((c) => useCoachStore.getState().updateMorale(c.id, moraleDelta));
    useScoutStore.getState().scouts
      .forEach((s) => useScoutStore.getState().updateMorale(s.id, moraleDelta));
  }

  useInteractionStore.getState().logInteraction({
    week: weekNumber,
    actorType: 'amp',
    actorId: 'amp',
    targetType: targetType === 'squad' ? 'squad' : 'staff',
    targetId: targetType === 'squad' ? 'squad_wide' : 'staff_wide',
    category: 'AMP_GROUP',
    subtype: targetType === 'squad' ? 'dressing_room_address' : 'full_staff_address',
    relationshipDelta: 0,
    traitDeltas: {},
    moraleDelta,
    isVisibleToAmp: true,
    visibilityReason: 'direct_action',
    narrativeSummary: targetType === 'squad'
      ? `You addressed the squad. (+${moraleDelta} morale)`
      : `You held a staff meeting. (+${moraleDelta} morale)`,
  });

  useInteractionStore.getState().logGroupSession({ week: weekNumber, targetType });
}

function DressingRoomPane({ onRenamePress }: { onRenamePress: (clique: Clique) => void }) {
  const health = useInteractionStore((s) => s.dressingRoomHealth);
  const cliques = useInteractionStore((s) => s.cliques);
  const allPlayers = useSquadStore((s) => s.players);
  const activePlayers = useMemo(() => allPlayers.filter((p) => p.isActive), [allPlayers]);
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const groupSessionLog = useInteractionStore((s) => s.groupSessionLog);
  const [pendingSession, setPendingSession] = useState<'squad' | 'staff' | null>(null);

  const detectedCliques = cliques.filter((c) => c.isDetected);
  const cliquedIds = new Set(detectedCliques.flatMap((c) => c.memberIds));
  const noGroupCount = activePlayers.filter((p) => !cliquedIds.has(p.id)).length;

  function getUseCount(type: 'squad' | 'staff'): number {
    return groupSessionLog.filter(
      (e) => e.targetType === type && e.week >= weekNumber - 4,
    ).length;
  }

  const squadUses = getUseCount('squad');
  const staffUses = getUseCount('staff');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: FAB_CLEARANCE }}>

      {/* Atmosphere card */}
      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow}>DRESSING ROOM ATMOSPHERE</PixelText>

        {health === null ? (
          <BodyText size={13} dim style={{ marginTop: 10 }}>Advance a week to see atmosphere data.</BodyText>
        ) : (
          <>
            {health.tension > 60 && (
              <View style={{ backgroundColor: 'rgba(200,30,30,0.15)', borderWidth: 2, borderColor: WK.red, padding: 6, marginTop: 8 }}>
                <PixelText size={6} color={WK.red}>⚠ VOLATILE — HIGH TENSION IN THE GROUP</PixelText>
              </View>
            )}
            {/* Cohesion */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>COHESION</BodyText>
                <PixelText size={7} color={WK.green}>{health.cohesion}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.cohesion}%`, backgroundColor: WK.green }} />
              </View>
            </View>
            {/* Tension */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>TENSION</BodyText>
                <PixelText size={7} color={WK.red}>{health.tension}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.tension}%`, backgroundColor: WK.red }} />
              </View>
            </View>
            {/* Avg morale */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>AVG MORALE</BodyText>
                <PixelText size={7} color={WK.yellow}>{health.squadMoraleAverage}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.squadMoraleAverage}%`, backgroundColor: WK.yellow }} />
              </View>
            </View>
          </>
        )}
      </View>

      {/* Groups card — only shown once at least one group has formed */}
      {detectedCliques.length > 0 && (
        <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
          <PixelText size={8} upper color={WK.yellow}>GROUPS</PixelText>

          {detectedCliques.map((clique) => (
            <Pressable
              key={clique.id}
              onPress={() => onRenamePress(clique)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: WK.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, backgroundColor: CLIQUE_PALETTE[clique.color], borderWidth: 2, borderColor: WK.border }} />
                <PixelText size={7}>{clique.name.toUpperCase()}</PixelText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <BodyText size={11} dim>{clique.memberIds.length} MEMBERS</BodyText>
                <BodyText size={11} color={WK.yellow}>[ RENAME ]</BodyText>
              </View>
            </Pressable>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
            <View style={{ width: 10, height: 10, backgroundColor: NO_GROUP_COLOR, borderWidth: 2, borderColor: WK.border }} />
            <BodyText size={13} color={NO_GROUP_COLOR}>NO GROUP</BodyText>
            <BodyText size={11} dim>— {noGroupCount} PLAYERS</BodyText>
          </View>
        </View>
      )}

      {/* Group sessions card */}
      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 12 }}>GROUP SESSIONS</PixelText>

        <Button
          label="ADDRESS THE SQUAD"
          variant="yellow"
          fullWidth
          disabled={squadUses >= 1}
          onPress={() => setPendingSession('squad')}
        />
        <View style={{ marginTop: 4, marginBottom: 12 }}>
          <BodyText size={11} color={squadUses >= 1 ? WK.red : WK.green}>
            {squadUses >= 1 ? 'Used this month — available next month' : 'Available'}
          </BodyText>
        </View>

        <Button
          label="STAFF MEETING"
          variant="teal"
          fullWidth
          disabled={staffUses >= 1}
          onPress={() => setPendingSession('staff')}
        />
        <View style={{ marginTop: 4 }}>
          <BodyText size={11} color={staffUses >= 1 ? WK.red : WK.green}>
            {staffUses >= 1 ? 'Used this month — available next month' : 'Available'}
          </BodyText>
        </View>
      </View>

      <PixelDialog
        visible={pendingSession !== null}
        title={pendingSession === 'squad' ? 'ADDRESS THE SQUAD' : 'STAFF MEETING'}
        message={
          pendingSession === 'squad'
            ? 'Gather the squad and deliver a motivational address. All active players will receive a +8 morale boost.'
            : 'Hold a full staff meeting with coaches and scouts. All staff will receive a +8 morale boost.'
        }
        confirmLabel="CONFIRM"
        cancelLabel="CANCEL"
        onClose={() => setPendingSession(null)}
        onConfirm={() => {
          if (pendingSession) handleGroupSession(pendingSession);
          setPendingSession(null);
        }}
      />

    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function DangerStatusCard() {
  const {
    weeksNegativeBalance,
    weeksUnderPlayerFloor,
    weeksUnderCoachRatio,
    weeksCoachesWithFewPlayers,
  } = useLossConditionStore();
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);

  const warnings: { label: string; color: string }[] = [];

  if (weeksNegativeBalance > 0) {
    const weeksLeft = Math.max(0, 8 - weeksNegativeBalance);
    const color = weeksNegativeBalance >= 5 ? WK.red : WK.orange;
    warnings.push({
      label: `FINANCES: In the red — ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''} remaining`,
      color,
    });
  }

  if (weeksUnderPlayerFloor > 0) {
    const weeksLeft = Math.max(0, 4 - weeksUnderPlayerFloor);
    warnings.push({
      label: `SQUAD: Only ${players.length} player${players.length !== 1 ? 's' : ''} — ${weeksLeft}wk to closure`,
      color: WK.red,
    });
  }

  if (weeksUnderCoachRatio > 0) {
    warnings.push({
      label: `RATIO: ${players.length} players, ${coaches.length} coach${coaches.length !== 1 ? 'es' : ''} — sign a coach`,
      color: WK.orange,
    });
  }

  if (weeksCoachesWithFewPlayers > 0) {
    warnings.push({
      label: 'COACHES: Too few players — coaches may leave',
      color: WK.orange,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.red,
      marginHorizontal: 10,
      marginTop: 10,
      padding: 12,
      gap: 8,
      ...pixelShadow,
    }}>
      <PixelText size={8} color={WK.red} upper>⚠ Club Alerts</PixelText>
      {warnings.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, backgroundColor: w.color, flexShrink: 0 }} />
          <BodyText size={13} color={w.color} style={{ flex: 1 }}>{w.label}</BodyText>
        </View>
      ))}
    </View>
  );
}

function UpkeepWarningBanner() {
  const balancePence    = useClubStore((s) => s.club.balance ?? 0);
  const reputation      = useClubStore((s) => s.club.reputation ?? 0);
  const reputationTier  = useClubStore((s) => s.club.reputationTier ?? 'Local');
  const levels          = useFacilityStore((s) => s.levels);
  const templates       = useFacilityStore((s) => s.templates);
  const conditions      = useFacilityStore((s) => s.conditions);
  const ticketPrice     = useFacilityStore((s) => s.ticketPrice);
  const config          = useGameConfigStore((s) => s.config);

  const totalUpkeep = calculateTotalUpkeep(templates, levels); // pence
  if (totalUpkeep === 0) return null;

  // Facility income per home-match week (matchday non-stand + stand attendance)
  const fullMatchdayIncome =
    calculateMatchdayIncome(templates, levels, conditions, reputation) +
    calculateStandIncome(templates, levels, conditions, reputationTier, ticketPrice);

  // Average weekly income: home games ~50% of weeks, non-match weeks earn a reduced %
  const nonMatchPct = config.nonMatchFacilityIncomePercent ?? 0;
  const avgWeeklyFacilityIncome = Math.floor(fullMatchdayIncome * (1 + nonMatchPct / 100) / 2);

  // Net weekly drain after facility profits offset upkeep
  const netWeeklyDrain = Math.max(0, totalUpkeep - avgWeeklyFacilityIncome);

  // If facility income covers all upkeep, no warning needed
  if (netWeeklyDrain === 0) return null;

  const weeksUntilBroke = Math.floor(balancePence / netWeeklyDrain);
  if (weeksUntilBroke >= 10) return null;

  return (
    <View style={{
      backgroundColor: WK.red,
      borderBottomWidth: 3,
      borderBottomColor: '#8b0000',
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <BodyText size={13} color={WK.text}>HIGH UPKEEP</BodyText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Money pence={netWeeklyDrain} color={WK.text} size={13} />
        <BodyText size={13} color={WK.text}>/WK NET · {weeksUntilBroke}WK LEFT</BodyText>
      </View>
    </View>
  );
}

export default function ClubHubScreen() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<ClubTab>('SQUAD');
  useEffect(() => {
    if (tabParam && CLUB_TABS.includes(tabParam as ClubTab)) {
      setActiveTab(tabParam as ClubTab);
    }
  }, [tabParam]);
  const [renameTarget, setRenameTarget] = useState<Clique | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameClique = useInteractionStore((s) => s.renameClique);
  const club = useClubStore((s) => s.club);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...CLUB_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as ClubTab)}
      />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <PixelText size={10} upper>Club</PixelText>
        <Money pence={club.balance ?? 0} size={14} color={WK.yellow} />
      </View>
      <UpkeepWarningBanner />
      <DangerStatusCard />

      {activeTab === 'SQUAD' && <SquadPane />}
      {activeTab === 'STAFF' && <StaffPane />}
      {activeTab === 'PERFORMANCE' && <PerformancePane />}
      {activeTab === 'DRESSING ROOM' && (
        <DressingRoomPane
          onRenamePress={(clique) => { setRenameTarget(clique); setRenameValue(clique.name); }}
        />
      )}

      {/* Clique rename modal */}
      <Modal visible={renameTarget !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: WK.tealDark, borderWidth: 3, borderColor: WK.yellow, padding: 20, ...pixelShadow }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, backgroundColor: CLIQUE_PALETTE[renameTarget?.color ?? 'coral'] }} />
              <PixelText size={8} upper color={WK.yellow}>RENAME GROUP</PixelText>
            </View>
            <TextInput
              style={{ marginTop: 16, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, color: WK.text, fontFamily: WK.font, fontSize: 9, padding: 10 }}
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={20}
              autoFocus
            />
            <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
              <Button
                label="SAVE"
                variant="yellow"
                disabled={renameValue.trim().length === 0}
                onPress={() => {
                  if (renameTarget && renameValue.trim()) renameClique(renameTarget.id, renameValue.trim());
                  setRenameTarget(null);
                }}
                style={{ flex: 1 }}
              />
              <Button label="CANCEL" variant="teal" onPress={() => setRenameTarget(null)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
