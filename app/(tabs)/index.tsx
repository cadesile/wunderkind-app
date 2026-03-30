import { useState, useMemo } from 'react';
import { View, FlatList, ScrollView, Modal, Pressable, TextInput } from 'react-native';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';
import { hapticTap, hapticWarning } from '@/utils/haptics';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { Scout } from '@/types/market';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';

const ACADEMY_TABS = ['SQUAD', 'COACHES', 'SCOUTS', 'DRESSING ROOM'] as const;
type AcademyTab = typeof ACADEMY_TABS[number];

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

function CoachRow({ coach, onFire }: { coach: Coach; onFire: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 10,
      marginBottom: 6,
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
        <PixelText size={8} color={WK.tealLight} style={{ marginBottom: 3 }}>{coach.role.toUpperCase()}</PixelText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
          <FlagText nationality={coach.nationality} size={11} />
          <BodyText size={11} dim numberOfLines={1} style={{ flex: 1 }}>{coach.nationality}</BodyText>
          <BodyText size={11} dim style={{ flexShrink: 0 }}>· £{Math.round(coach.salary / 100).toLocaleString()}/wk</BodyText>
        </View>

        {/* Influence bar */}
        <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border, marginBottom: 5 }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>

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

      {/* Right: badge + release */}
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Badge label={`INF ${coach.influence}`} color="yellow" />
        <Pressable onPress={() => { hapticWarning(); onFire(); }} hitSlop={10}>
          <PixelText size={7} color={WK.red}>RELEASE</PixelText>
        </Pressable>
      </View>
    </View>
  );
}

function CoachProspectCard({ coach, onSign }: { coach: MarketCoach; onSign: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.tealMid,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={9} upper numberOfLines={1}>{coach.firstName} {coach.lastName}</PixelText>
          <PixelText size={8} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <BodyText size={12} dim numberOfLines={1} style={{ flex: 1 }}>{coach.nationality}</BodyText>
          </View>
        </View>
        <Badge label={`INF ${coach.influence}`} color="green" />
      </View>
      <BodyText size={13} dim>SALARY: £{Math.round(coach.salary / 100).toLocaleString()}/wk</BodyText>
      <View style={{ marginTop: 8 }}>
        <Button label="SIGN" variant="yellow" fullWidth onPress={onSign} />
      </View>
    </View>
  );
}

// ─── Scout cards ──────────────────────────────────────────────────────────────

const RANGE_LABEL: Record<Scout['scoutingRange'], string> = {
  local: 'LOCAL',
  national: 'NATIONAL',
  international: 'INTL',
};

function ScoutRow({ scout }: { scout: Scout }) {
  const router = useRouter();
  const isOnMission = scout.activeMission?.status === 'active';

  return (
    <Pressable onPress={() => { hapticTap(); router.push(`/scout/${scout.id}`); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isOnMission ? WK.orange : WK.border,
        padding: 10,
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...pixelShadow,
      }}>
        {/* Avatar */}
        <Avatar appearance={scout.appearance} role="SCOUT" size={44} morale={scout.morale ?? 70} />

        {/* Main content */}
        <View style={{ flex: 1 }}>
          {/* Name + mission badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <BodyText size={14} upper numberOfLines={1} style={{ flex: 1 }}>{scout.name}</BodyText>
            {isOnMission && <Badge label="ACTIVE" color="yellow" />}
          </View>

          <PixelText size={8} color={WK.tealLight} style={{ marginBottom: 3 }}>{RANGE_LABEL[scout.scoutingRange]} SCOUT</PixelText>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
            <FlagText nationality={scout.nationality} size={11} />
            <BodyText size={11} dim numberOfLines={1} style={{ flex: 1 }}>{scout.nationality}</BodyText>
            <BodyText size={11} dim style={{ flexShrink: 0 }}>· £{Math.round(scout.salary / 100).toLocaleString()}/wk</BodyText>
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
  );
}

function ScoutProspectCard({ scout, onSign }: { scout: MarketScout; onSign: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.tealMid,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={9} upper numberOfLines={1}>{scout.firstName} {scout.lastName}</PixelText>
          <PixelText size={8} color={WK.tealLight} style={{ marginTop: 2 }}>
            {RANGE_LABEL[scout.scoutingRange]} SCOUT
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={12} />
            <BodyText size={12} dim>{scout.nationality}</BodyText>
          </View>
        </View>
        <Badge label={`${scout.successRate}%`} color="green" />
      </View>
      <BodyText size={13} dim>SALARY: £{Math.round(scout.salary / 100).toLocaleString()}/wk</BodyText>
      <View style={{ marginTop: 8 }}>
        <Button label="RECRUIT" variant="yellow" fullWidth onPress={onSign} />
      </View>
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
      render: (p) => {
        const m = p.morale ?? 50;
        const color = m >= 70 ? WK.green : m >= 40 ? WK.yellow : WK.red;
        return <PixelText size={9} color={color}>{m}</PixelText>;
      },
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
        <SortableTable
          columns={PLAYER_COLS}
          data={players}
          defaultSortKey="overallRating"
          defaultSortDir="desc"
          onRowPress={(p) => { hapticTap(); router.push(`/player/${p.id}`); }}
          emptyMessage="NO PLAYERS"
        />
      </ScrollView>
    </View>
  );
}

function CoachesPane() {
  const { coaches, removeCoach } = useCoachStore();
  const { academy, addBalance } = useAcademyStore();
  const marketCoaches = useMarketStore((s) => s.coaches);
  const hireCoach = useMarketStore((s) => s.hireCoach);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [pendingFire, setPendingFire] = useState<{ coach: Coach; penalty: number; penaltyPence: number } | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const weekNumber = academy.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);

  // Show up to 3 available market coaches in the recruit modal
  const prospectCoaches = marketCoaches.slice(0, 3);

  function openScout() {
    setSignError(null);
    setShowModal(true);
  }

  function signCoach(mc: MarketCoach) {
    const signingFee = mc.salary * 4;
    if (academy.balance < signingFee * 100) {
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee * 100);
    hireCoach(mc.id, weekNumber);
  }

  function fireCoach(coach: Coach) {
    const penaltyPence = Math.floor(coach.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    setFireError(null);
    setPendingFire({ coach, penalty: penaltyPounds, penaltyPence });
  }

  function confirmFireCoach() {
    if (!pendingFire) return;
    const { coach, penalty, penaltyPence } = pendingFire;
    const currentBalancePounds = penceToPounds(academy.balance ?? 0);
    if (currentBalancePounds < penalty) {
      setFireError(`INSUFFICIENT FUNDS — need £${penalty.toLocaleString()}`);
      setPendingFire(null);
      return;
    }
    addBalance(-penalty * 100);
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${coach.name} (25% early termination)`,
      weekNumber,
    });
    removeCoach(coach.id);
    setPendingFire(null);
  }

  const COACH_COLS: ColumnDef<Coach>[] = [
    {
      key: 'name',
      label: 'NAME',
      flex: 2.5,
      sortValue: (c) => c.name,
      render: (c) => <BodyText size={13} upper numberOfLines={1}>{shortName(c.name)}</BodyText>,
    },
    {
      key: 'nationality',
      label: 'NAT',
      flex: 1,
      align: 'center',
      sortValue: (c) => c.nationality,
      render: (c) => <FlagText nationality={c.nationality} size={16} />,
    },
    {
      key: 'role',
      label: 'ROLE',
      flex: 2,
      sortValue: (c) => c.role,
      render: (c) => <PixelText size={8} color={WK.tealLight} numberOfLines={1}>{c.role.toUpperCase()}</PixelText>,
    },
    {
      key: 'influence',
      label: 'INF',
      flex: 1,
      align: 'center',
      sortValue: (c) => c.influence,
      render: (c) => <Badge label={`${c.influence}`} color="yellow" />,
    },
    {
      key: 'salary',
      label: 'WAGE',
      flex: 1.5,
      align: 'right',
      sortValue: (c) => c.salary,
      render: (c) => <PixelText size={9} color={WK.orange}>£{Math.round(c.salary / 100).toLocaleString()}</PixelText>,
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Stats strip */}
      <View style={{ flexDirection: 'row', margin: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={8} dim>TOTAL INFLUENCE</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{totalInfluence}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={8} dim>WEEKLY COST</PixelText>
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{Math.round(totalSalary / 100).toLocaleString()}</PixelText>
        </Card>
      </View>

      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <Button label="◈ RECRUIT COACHES" variant="green" fullWidth onPress={openScout} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}>
        <SortableTable
          columns={COACH_COLS}
          data={coaches}
          defaultSortKey="influence"
          defaultSortDir="desc"
          onRowPress={(c) => { hapticTap(); router.push(`/coach/${c.id}`); }}
          emptyMessage="NO COACHES SIGNED"
        />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={() => {}} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.yellow,
              padding: 16,
              ...pixelShadow,
            }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 14 }}>Review Prospects</PixelText>
              <BodyText size={13} dim style={{ textAlign: 'center', marginBottom: 14 }}>SIGNING FEE = 4 WKS SALARY</BodyText>
              {prospectCoaches.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>NO COACHES AVAILABLE</PixelText>
                  <PixelText size={6} dim style={{ marginTop: 6 }}>Check back after advancing a week</PixelText>
                  <View style={{ marginTop: 12 }}>
                    <Button label="CLOSE" variant="teal" onPress={() => setShowModal(false)} />
                  </View>
                </View>
              ) : (
                <>
                  {signError && (
                    <BodyText size={13} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>
                      {signError}
                    </BodyText>
                  )}
                  {prospectCoaches.map((c) => (
                    <CoachProspectCard key={c.id} coach={c} onSign={() => signCoach(c)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PixelDialog
        visible={!!pendingFire}
        title="Release Coach?"
        message={pendingFire
          ? `Release ${pendingFire.coach.name}?\n\nEarly termination fee: £${pendingFire.penalty.toLocaleString()}\n(25% of 26 remaining weeks)`
          : ''}
        onClose={() => setPendingFire(null)}
        onConfirm={confirmFireCoach}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />

      <PixelDialog
        visible={!!fireError}
        title="Insufficient Funds"
        message={fireError ?? ''}
        onClose={() => setFireError(null)}
      />
    </View>
  );
}

function ScoutsPane() {
  const { scouts, removeScout } = useScoutStore();
  const { academy, addBalance } = useAcademyStore();
  const marketScouts = useMarketStore((s) => s.marketScouts);
  const hireScout = useMarketStore((s) => s.hireScout);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [pendingFire, setPendingFire] = useState<{ scout: Scout; penalty: number; penaltyPence: number } | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const weekNumber = academy.weekNumber ?? 1;
  const totalSalary = scouts.reduce((s, sc) => s + sc.salary, 0);

  // Show up to 3 available market scouts in the recruit modal
  const prospectScouts = marketScouts.slice(0, 3);

  function openRecruit() {
    setSignError(null);
    setShowModal(true);
  }

  function signScout(ms: MarketScout) {
    const signingFee = ms.salary * 4;
    if (academy.balance < signingFee * 100) {
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee * 100);
    hireScout(ms.id, weekNumber);
  }

  function fireScout(scout: Scout) {
    const penaltyPence = Math.floor(scout.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    setFireError(null);
    setPendingFire({ scout, penalty: penaltyPounds, penaltyPence });
  }

  function confirmFireScout() {
    if (!pendingFire) return;
    const { scout, penalty, penaltyPence } = pendingFire;
    const currentBalancePounds = penceToPounds(academy.balance ?? 0);
    if (currentBalancePounds < penalty) {
      setFireError(`INSUFFICIENT FUNDS — need £${penalty.toLocaleString()}`);
      setPendingFire(null);
      return;
    }
    addBalance(-penalty * 100);
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${scout.name} (25% early termination)`,
      weekNumber,
    });
    removeScout(scout.id);
    setPendingFire(null);
  }

  const SCOUT_COLS: ColumnDef<Scout>[] = [
    {
      key: 'name',
      label: 'NAME',
      flex: 2.5,
      sortValue: (s) => s.name,
      render: (s) => <BodyText size={13} upper numberOfLines={1}>{shortName(s.name)}</BodyText>,
    },
    {
      key: 'nationality',
      label: 'NAT',
      flex: 1,
      align: 'center',
      sortValue: (s) => s.nationality,
      render: (s) => <FlagText nationality={s.nationality} size={16} />,
    },
    {
      key: 'scoutingRange',
      label: 'SPEC',
      flex: 1.5,
      sortValue: (s) => s.scoutingRange,
      render: (s) => <PixelText size={8} color={WK.tealLight}>{RANGE_LABEL[s.scoutingRange]}</PixelText>,
    },
    {
      key: 'salary',
      label: 'WAGE',
      flex: 1.5,
      align: 'right',
      sortValue: (s) => s.salary,
      render: (s) => <PixelText size={9} color={WK.orange}>£{Math.round(s.salary / 100).toLocaleString()}</PixelText>,
    },
    {
      key: 'status',
      label: 'STATUS',
      flex: 1.5,
      align: 'center',
      sortValue: (s) => (s.activeMission?.status === 'active' ? 1 : 0),
      render: (s) => {
        const onMission = s.activeMission?.status === 'active';
        return (
          <View style={{
            backgroundColor: onMission ? WK.yellow + '33' : WK.tealDark,
            borderWidth: 1,
            borderColor: onMission ? WK.yellow : WK.dim,
            paddingHorizontal: 5,
            paddingVertical: 2,
          }}>
            <PixelText size={8} color={onMission ? WK.yellow : WK.dim}>
              {onMission ? 'ACTIVE' : 'FREE'}
            </PixelText>
          </View>
        );
      },
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Stats strip */}
      <View style={{ flexDirection: 'row', margin: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={8} dim>SCOUTS</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{scouts.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={8} dim>WEEKLY COST</PixelText>
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{Math.round(totalSalary / 100).toLocaleString()}</PixelText>
        </Card>
      </View>

      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <Button label="◈ RECRUIT SCOUTS" variant="green" fullWidth onPress={openRecruit} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}>
        <SortableTable
          columns={SCOUT_COLS}
          data={scouts}
          defaultSortKey="salary"
          defaultSortDir="desc"
          onRowPress={(s) => { hapticTap(); router.push(`/scout/${s.id}`); }}
          emptyMessage="NO SCOUTS RECRUITED"
        />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={() => {}} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.yellow,
              padding: 16,
              ...pixelShadow,
            }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 14 }}>Scout Prospects</PixelText>
              <BodyText size={13} dim style={{ textAlign: 'center', marginBottom: 14 }}>SIGNING FEE = 4 WKS SALARY</BodyText>
              {prospectScouts.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>NO SCOUTS AVAILABLE</PixelText>
                  <PixelText size={6} dim style={{ marginTop: 6 }}>Check back after advancing a week</PixelText>
                  <View style={{ marginTop: 12 }}>
                    <Button label="CLOSE" variant="teal" onPress={() => setShowModal(false)} />
                  </View>
                </View>
              ) : (
                <>
                  {signError && (
                    <BodyText size={13} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>
                      {signError}
                    </BodyText>
                  )}
                  {prospectScouts.map((s) => (
                    <ScoutProspectCard key={s.id} scout={s} onSign={() => signScout(s)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PixelDialog
        visible={!!pendingFire}
        title="Release Scout?"
        message={pendingFire
          ? `Release ${pendingFire.scout.name}?\n\nEarly termination fee: £${pendingFire.penalty.toLocaleString()}\n(25% of 26 remaining weeks)`
          : ''}
        onClose={() => setPendingFire(null)}
        onConfirm={confirmFireScout}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />

      <PixelDialog
        visible={!!fireError}
        title="Insufficient Funds"
        message={fireError ?? ''}
        onClose={() => setFireError(null)}
      />
    </View>
  );
}

// ─── Dressing Room ────────────────────────────────────────────────────────────

function handleGroupSession(targetType: 'squad' | 'staff'): void {
  const weekNumber = useAcademyStore.getState().academy.weekNumber ?? 1;
  const groupSessionLog = useInteractionStore.getState().groupSessionLog;

  const recentUses = groupSessionLog.filter(
    (e) => e.targetType === targetType && e.week >= weekNumber - 4,
  ).length;

  const moraleDelta =
    recentUses <= 1 ? 8 :
    recentUses === 2 ? 4 :
    recentUses === 3 ? 1 : -3;

  if (targetType === 'squad') {
    useSquadStore.getState().players
      .filter((p) => p.isActive)
      .forEach((p) => useSquadStore.getState().updateMorale(p.id, moraleDelta));
  } else {
    useCoachStore.getState().coaches
      .forEach((c) => useCoachStore.getState().updateMorale(c.id, moraleDelta));
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
      ? `You addressed the squad. (${moraleDelta > 0 ? '+' : ''}${moraleDelta} morale)`
      : `You held a staff meeting. (${moraleDelta > 0 ? '+' : ''}${moraleDelta} morale)`,
  });

  useInteractionStore.getState().logGroupSession({ week: weekNumber, targetType });

  if (recentUses >= 3) {
    useInteractionStore.getState().logInteraction({
      week: weekNumber,
      actorType: 'system',
      actorId: 'system',
      targetType: targetType === 'squad' ? 'squad' : 'staff',
      targetId: targetType === 'squad' ? 'squad_wide' : 'staff_wide',
      category: 'SYSTEM',
      subtype: 'group_session_fatigue',
      relationshipDelta: 0,
      traitDeltas: {},
      moraleDelta: 0,
      isVisibleToAmp: true,
      visibilityReason: 'direct_action',
      narrativeSummary: 'Your group sessions are losing effect. The squad has heard it before.',
    });
  }
}

function DressingRoomPane({ onRenamePress }: { onRenamePress: (clique: Clique) => void }) {
  const health = useInteractionStore((s) => s.dressingRoomHealth);
  const cliques = useInteractionStore((s) => s.cliques);
  const allPlayers = useSquadStore((s) => s.players);
  const activePlayers = useMemo(() => allPlayers.filter((p) => p.isActive), [allPlayers]);
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const groupSessionLog = useInteractionStore((s) => s.groupSessionLog);

  const detectedCliques = cliques.filter((c) => c.isDetected);
  const cliquedIds = new Set(detectedCliques.flatMap((c) => c.memberIds));
  const noGroupCount = activePlayers.filter((p) => !cliquedIds.has(p.id)).length;

  function getUseCount(type: 'squad' | 'staff'): number {
    return groupSessionLog.filter(
      (e) => e.targetType === type && e.week >= weekNumber - 4,
    ).length;
  }

  function fatigueColor(uses: number): string {
    if (uses <= 1) return WK.green;
    if (uses === 2) return WK.yellow;
    if (uses === 3) return WK.orange;
    return WK.red;
  }

  const squadUses = getUseCount('squad');
  const staffUses = getUseCount('staff');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }}>

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

        <Button label="ADDRESS THE SQUAD" variant="yellow" fullWidth onPress={() => handleGroupSession('squad')} />
        <View style={{ marginTop: 4, marginBottom: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <BodyText size={11} color={fatigueColor(squadUses)}>{squadUses} uses in last 4 weeks</BodyText>
          {squadUses >= 4 && <BodyText size={11} color={WK.red}>— LOSING EFFECT</BodyText>}
        </View>

        <Button label="STAFF MEETING" variant="teal" fullWidth onPress={() => handleGroupSession('staff')} />
        <View style={{ marginTop: 4, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <BodyText size={11} color={fatigueColor(staffUses)}>{staffUses} uses in last 4 weeks</BodyText>
          {staffUses >= 4 && <BodyText size={11} color={WK.red}>— LOSING EFFECT</BodyText>}
        </View>
      </View>

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
      <PixelText size={8} color={WK.red} upper>⚠ Academy Alerts</PixelText>
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
  const balancePence = useAcademyStore((s) => s.academy.balance ?? 0);
  const levels = useFacilityStore((s) => s.levels);
  const totalUpkeep = calculateTotalUpkeep(levels); // pence

  if (totalUpkeep === 0) return null;
  // Both values in pence — division gives correct weeks
  const weeksUntilBroke = Math.floor(balancePence / totalUpkeep);
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
      <BodyText size={13} color={WK.text}>
        £{penceToPounds(totalUpkeep).toLocaleString()}/WK · {weeksUntilBroke}WK LEFT
      </BodyText>
    </View>
  );
}

export default function AcademyHubScreen() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('SQUAD');
  const [renameTarget, setRenameTarget] = useState<Clique | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameClique = useInteractionStore((s) => s.renameClique);
  const academy = useAcademyStore((s) => s.academy);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof academy.balance === 'number' && !isNaN(academy.balance)
      ? academy.balance
      : academy.totalCareerEarnings * 100,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...ACADEMY_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as AcademyTab)}
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
        <PixelText size={10} upper>Academy</PixelText>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>
      <UpkeepWarningBanner />
      <DangerStatusCard />

      {activeTab === 'SQUAD' && <SquadPane />}
      {activeTab === 'COACHES' && <CoachesPane />}
      {activeTab === 'SCOUTS' && <ScoutsPane />}
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
