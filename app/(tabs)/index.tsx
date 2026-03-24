import { useState } from 'react';
import { View, FlatList, Modal, Pressable } from 'react-native';
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
import { generateCoachProspects, generateScoutProspects } from '@/engine/recruitment';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { useInteractionStore } from '@/stores/interactionStore';
import { CLIQUE_PALETTE, NO_GROUP_COLOR } from '@/types/interaction';
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

const ACADEMY_TABS = ['SQUAD', 'COACHES', 'SCOUTS'] as const;
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

function PlayerCard({ player }: { player: Player }) {
  const router = useRouter();
  const cliques = useInteractionStore((s) => s.cliques);
  const playerClique = cliques.find((c) => c.isDetected && c.memberIds.includes(player.id));
  const cliqueColor = playerClique ? CLIQUE_PALETTE[playerClique.color] : NO_GROUP_COLOR;
  const cliqueLabel = playerClique ? playerClique.name.toUpperCase() : 'NO GROUP';
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
    <Pressable onPress={() => { hapticTap(); router.push(`/player/${player.id}`); }} style={{ flex: 1 }}>
      <View style={{
        flex: 1,
        backgroundColor: cardStyle.backgroundColor,
        borderWidth: 3,
        borderColor: cardStyle.borderColor,
        padding: 8,
        marginBottom: 6,
        ...pixelShadow,
      }}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Avatar appearance={player.appearance} role="PLAYER" size={40} morale={player.morale ?? 70} age={player.age} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <PixelText size={7} upper numberOfLines={1} style={{ flex: 1, marginRight: 4 }}>{player.name}</PixelText>
          <Badge label={`${player.overallRating}`} color="yellow" />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <BodyText size={10} color={WK.tealLight}>{player.position} · {player.age}</BodyText>
          <ArchetypeBadge player={player} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <FlagText nationality={player.nationality} size={10} />
          <BodyText size={10} dim numberOfLines={1}>{player.nationality}</BodyText>
        </View>

        {/* 2×4 trait grid */}
        <View style={{ gap: 2, marginBottom: 4 }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: 'row', gap: 2 }}>
              {traitValues.slice(row * 4, row * 4 + 4).map((v, i) => (
                <View key={i} style={{ width: 8, height: 8, backgroundColor: traitColor(v), borderWidth: 1, borderColor: WK.border }} />
              ))}
            </View>
          ))}
        </View>

        {/* Clique tag */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, backgroundColor: cliqueColor, borderWidth: 2, borderColor: WK.border }} />
          <BodyText size={9} color={cliqueColor} numberOfLines={1}>{cliqueLabel}</BodyText>
        </View>

        {badgeLabel && (
          <View style={{ marginTop: 4, alignSelf: 'flex-start', backgroundColor: cardStyle.borderColor, borderWidth: 2, borderColor: WK.border, paddingHorizontal: 4, paddingVertical: 2 }}>
            <PixelText size={5} color={WK.text}>{badgeLabel}</PixelText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Coach cards ──────────────────────────────────────────────────────────────

function CoachCard({ coach, onFire }: { coach: Coach; onFire: () => void }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 10,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ alignItems: 'center', marginBottom: 6 }}>
        <Avatar appearance={coach.appearance} role="COACH" size={40} morale={coach.morale ?? 70} age={coach.age ?? 35} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
        <PixelText size={7} upper numberOfLines={1} style={{ flex: 1, marginRight: 4 }}>{coach.name}</PixelText>
        <Badge label={`INF ${coach.influence}`} color="yellow" />
      </View>
      <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 2 }}>{coach.role.toUpperCase()}</PixelText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <FlagText nationality={coach.nationality} size={11} />
        <PixelText size={6} dim numberOfLines={1}>{coach.nationality}</PixelText>
      </View>
      <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, marginBottom: 4 }}>
        <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
      </View>
      <PixelText size={6} dim style={{ marginBottom: 4 }}>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
      {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
          {(Object.entries(coach.specialisms) as [string, number][]).map(([attr]) => (
            <View key={attr} style={{ paddingHorizontal: 4, paddingVertical: 2, backgroundColor: WK.tealDark, borderWidth: 1, borderColor: WK.yellow }}>
              <PixelText size={5} color={WK.yellow}>{attr.toUpperCase()}</PixelText>
            </View>
          ))}
        </View>
      )}
      <Pressable onPress={() => { hapticWarning(); onFire(); }} style={{ alignSelf: 'flex-end' }}>
        <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
      </Pressable>
    </View>
  );
}

function CoachProspectCard({ coach, onSign }: { coach: Coach; onSign: () => void }) {
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
        <Avatar appearance={coach.appearance} role="COACH" size={44} morale={70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
        </View>
        <Badge label={`INF ${coach.influence}`} color="green" />
      </View>
      <PixelText size={6} dim>SALARY: £{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
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

function ScoutCard({ scout }: { scout: Scout }) {
  const router = useRouter();
  const isOnMission = scout.activeMission?.status === 'active';

  return (
    <Pressable
      onPress={() => { hapticTap(); router.push(`/scout/${scout.id}`); }}
      style={{ flex: 1 }}
    >
      <View style={{
        flex: 1,
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isOnMission ? WK.orange : WK.border,
        padding: 10,
        marginBottom: 10,
        ...pixelShadow,
      }}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Avatar appearance={scout.appearance} role="SCOUT" size={40} morale={scout.morale ?? 70} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <PixelText size={7} upper numberOfLines={1} style={{ flex: 1, marginRight: 4 }}>{scout.name}</PixelText>
          <Badge label={`${scout.successRate}%`} color="yellow" />
        </View>
        <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 2 }}>{RANGE_LABEL[scout.scoutingRange]} SCOUT</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <FlagText nationality={scout.nationality} size={11} />
          <PixelText size={6} dim numberOfLines={1}>{scout.nationality}</PixelText>
        </View>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, marginBottom: 4 }}>
          <View style={{ height: '100%', width: `${scout.successRate}%`, backgroundColor: traitColor(Math.round(scout.successRate / 5)) }} />
        </View>
        <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
        {isOnMission && <View style={{ marginTop: 4 }}><Badge label="ON MISSION" color="yellow" /></View>}
      </View>
    </Pressable>
  );
}

function ScoutProspectCard({ scout, onSign }: { scout: Scout; onSign: () => void }) {
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
        <Avatar appearance={scout.appearance} role="SCOUT" size={44} morale={scout.morale ?? 70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
            {RANGE_LABEL[scout.scoutingRange]} SCOUT
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={12} />
            <PixelText size={7} dim>{scout.nationality}</PixelText>
          </View>
        </View>
        <Badge label={`${scout.successRate}%`} color="green" />
      </View>
      <PixelText size={6} dim>SALARY: £{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
      <View style={{ marginTop: 8 }}>
        <Button label="RECRUIT" variant="yellow" fullWidth onPress={onSign} />
      </View>
    </View>
  );
}

// ─── Panes ────────────────────────────────────────────────────────────────────

const POSITION_FILTERS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const;
type PositionFilter = typeof POSITION_FILTERS[number];

function SquadPane() {
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const allPlayers = useSquadStore((s) => s.players);

  const players = allPlayers
    .filter((p) => p.isActive && (posFilter === 'ALL' || p.position === posFilter))
    .sort((a, b) => b.overallRating - a.overallRating);

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
                paddingVertical: 6,
                backgroundColor: active ? WK.yellow : WK.tealCard,
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
                alignItems: 'center',
              }}
            >
              <PixelText size={6} color={active ? WK.border : WK.dim}>{pos}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {players.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO PLAYERS</PixelText>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 6 }}
          renderItem={({ item }) => <PlayerCard player={item} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </View>
  );
}

function CoachesPane() {
  const { coaches, addCoach, removeCoach } = useCoachStore();
  const { academy, addBalance } = useAcademyStore();
  const [showModal, setShowModal] = useState(false);
  const [prospects, setProspects] = useState<Coach[]>([]);
  const [signError, setSignError] = useState<string | null>(null);
  const [pendingFire, setPendingFire] = useState<{ coach: Coach; penalty: number; penaltyPence: number } | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const weekNumber = academy.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);

  function openScout() {
    setSignError(null);
    setProspects(generateCoachProspects(3, weekNumber));
    setShowModal(true);
  }

  function signCoach(coach: Coach) {
    const signingFee = coach.salary * 4; // whole pounds
    if (academy.balance < signingFee * 100) { // balance is pence
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee * 100); // deduct pence
    addCoach({ ...coach, joinedWeek: weekNumber });
    setProspects((prev) => prev.filter((p) => p.id !== coach.id));
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
    addBalance(-penalty * 100); // penalty is whole pounds → pence
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${coach.name} (25% early termination)`,
      weekNumber,
    });
    removeCoach(coach.id);
    setPendingFire(null);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Stats strip */}
      <View style={{ flexDirection: 'row', margin: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>TOTAL INFLUENCE</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{totalInfluence}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>WEEKLY COST</PixelText>
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{Math.round(totalSalary / 100).toLocaleString()}</PixelText>
        </Card>
      </View>

      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <Button label="◈ RECRUIT COACHES" variant="green" fullWidth onPress={openScout} />
      </View>

      {coaches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO COACHES SIGNED</PixelText>
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(c) => c.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 6 }}
          renderItem={({ item }) => <CoachCard coach={item} onFire={() => fireCoach(item)} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

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
              <PixelText size={6} dim style={{ textAlign: 'center', marginBottom: 14 }}>SIGNING FEE = 4 WKS SALARY</PixelText>
              {prospects.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>ALL PROSPECTS SIGNED</PixelText>
                  <View style={{ marginTop: 12 }}>
                    <Button label="CLOSE" variant="teal" onPress={() => setShowModal(false)} />
                  </View>
                </View>
              ) : (
                <>
                  {signError && (
                    <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>
                      {signError}
                    </PixelText>
                  )}
                  {prospects.map((c) => (
                    <CoachProspectCard key={c.id} coach={c} onSign={() => signCoach(c)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fire coach confirmation dialog */}
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

      {/* Insufficient funds after fire attempt */}
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
  const { scouts, addScout, removeScout } = useScoutStore();
  const { academy, addBalance } = useAcademyStore();
  const [showModal, setShowModal] = useState(false);
  const [prospects, setProspects] = useState<Scout[]>([]);
  const [signError, setSignError] = useState<string | null>(null);
  const [pendingFire, setPendingFire] = useState<{ scout: Scout; penalty: number; penaltyPence: number } | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);

  const weekNumber = academy.weekNumber ?? 1;
  const totalSalary = scouts.reduce((s, sc) => s + sc.salary, 0);

  function openRecruit() {
    setSignError(null);
    setProspects(generateScoutProspects(3, weekNumber));
    setShowModal(true);
  }

  function signScout(scout: Scout) {
    const signingFee = scout.salary * 4; // whole pounds
    if (academy.balance < signingFee * 100) { // balance is pence
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee * 100); // deduct pence
    addScout({ ...scout, joinedWeek: weekNumber });
    setProspects((prev) => prev.filter((p) => p.id !== scout.id));
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
    addBalance(-penalty * 100); // penalty is whole pounds → pence
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${scout.name} (25% early termination)`,
      weekNumber,
    });
    removeScout(scout.id);
    setPendingFire(null);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Stats strip */}
      <View style={{ flexDirection: 'row', margin: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>SCOUTS</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{scouts.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>WEEKLY COST</PixelText>
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{Math.round(totalSalary / 100).toLocaleString()}</PixelText>
        </Card>
      </View>

      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <Button label="◈ RECRUIT SCOUTS" variant="green" fullWidth onPress={openRecruit} />
      </View>

      {scouts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO SCOUTS RECRUITED</PixelText>
        </View>
      ) : (
        <FlatList
          data={scouts}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 6 }}
          renderItem={({ item }) => <ScoutCard scout={item} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

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
              <PixelText size={6} dim style={{ textAlign: 'center', marginBottom: 14 }}>SIGNING FEE = 4 WKS SALARY</PixelText>
              {prospects.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>ALL PROSPECTS RECRUITED</PixelText>
                  <View style={{ marginTop: 12 }}>
                    <Button label="CLOSE" variant="teal" onPress={() => setShowModal(false)} />
                  </View>
                </View>
              ) : (
                <>
                  {signError && (
                    <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>
                      {signError}
                    </PixelText>
                  )}
                  {prospects.map((s) => (
                    <ScoutProspectCard key={s.id} scout={s} onSign={() => signScout(s)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fire scout confirmation dialog */}
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

      {/* Insufficient funds after fire attempt */}
      <PixelDialog
        visible={!!fireError}
        title="Insufficient Funds"
        message={fireError ?? ''}
        onClose={() => setFireError(null)}
      />
    </View>
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
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, backgroundColor: w.color }} />
          <PixelText size={6} color={w.color} style={{ flex: 1 }}>{w.label}</PixelText>
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
      <PixelText size={6} color={WK.text}>HIGH UPKEEP</PixelText>
      <PixelText size={6} color={WK.text}>
        £{penceToPounds(totalUpkeep).toLocaleString()}/WK · {weeksUntilBroke}WK LEFT
      </PixelText>
    </View>
  );
}

export default function AcademyHubScreen() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('SQUAD');
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
    </SafeAreaView>
  );
}
