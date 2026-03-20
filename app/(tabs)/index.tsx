import { useState } from 'react';
import { View, FlatList, Modal, Pressable } from 'react-native';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { generateCoachProspects, generateScoutProspects } from '@/engine/recruitment';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { useInteractionStore } from '@/stores/interactionStore';
import { CLIQUE_PALETTE, NO_GROUP_COLOR } from '@/types/interaction';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { hapticTap, hapticWarning } from '@/utils/haptics';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { Scout } from '@/types/market';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { moraleEmoji } from '@/utils/morale';

const ACADEMY_TABS = ['SQUAD', 'COACHES', 'SCOUTS'] as const;
type AcademyTab = typeof ACADEMY_TABS[number];

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: Player }) {
  const router = useRouter();
  const cliques = useInteractionStore((s) => s.cliques);
  const playerClique = cliques.find((c) => c.isDetected && c.memberIds.includes(player.id));
  const cliqueColor = playerClique ? CLIQUE_PALETTE[playerClique.color] : NO_GROUP_COLOR;
  const cliqueLabel = playerClique ? playerClique.name.toUpperCase() : 'NO GROUP';

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
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 8,
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...pixelShadow,
      }}>
        <Avatar appearance={player.appearance} role="PLAYER" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper style={{ marginBottom: 2 }}>{player.name}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <BodyText size={11} color={WK.tealLight}>{player.position} · AGE {player.age}</BodyText>
            <ArchetypeBadge player={player} />
          </View>
          <BodyText size={11} dim>{player.nationality}</BodyText>

          {/* 2×4 trait grid */}
          <View style={{ marginTop: 4, gap: 2 }}>
            {[0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 2 }}>
                {traitValues.slice(row * 4, row * 4 + 4).map((v, i) => (
                  <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: traitColor(v),
                      borderWidth: 1,
                      borderColor: WK.border,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Clique tag */}
          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 8,
              height: 8,
              backgroundColor: cliqueColor,
              borderWidth: 2,
              borderColor: WK.border,
            }} />
            <BodyText size={11} color={cliqueColor}>{cliqueLabel}</BodyText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${player.overallRating}`} color="yellow" />
          <PixelText size={12}>{moraleEmoji(player.morale ?? 70)}</PixelText>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Coach cards ──────────────────────────────────────────────────────────────

function CoachCard({ coach, onFire }: { coach: Coach; onFire: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Avatar appearance={coach.appearance} role="COACH" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <PixelText size={7} dim style={{ marginTop: 2 }}>{coach.nationality}</PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>
      </View>
      {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {(Object.entries(coach.specialisms) as [string, number][]).map(([attr, strength]) => (
            <View key={attr} style={{
              paddingHorizontal: 5,
              paddingVertical: 2,
              backgroundColor: WK.tealDark,
              borderWidth: 1,
              borderColor: WK.yellow,
            }}>
              <PixelText size={6} color={WK.yellow}>{attr.toUpperCase()} {strength}</PixelText>
            </View>
          ))}
        </View>
      )}
      <Pressable onPress={() => { hapticWarning(); onFire(); }} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
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
        <Avatar appearance={coach.appearance} role="COACH" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <PixelText size={7} dim style={{ marginTop: 2 }}>{coach.nationality}</PixelText>
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

function ScoutCard({ scout, onFire }: { scout: Scout; onFire: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Avatar appearance={scout.appearance} role="SCOUT" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
            {RANGE_LABEL[scout.scoutingRange]} SCOUT
          </PixelText>
          <PixelText size={7} dim style={{ marginTop: 2 }}>{scout.nationality}</PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${scout.successRate}%`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${scout.successRate}%`, backgroundColor: traitColor(Math.round(scout.successRate / 5)) }} />
        </View>
      </View>
      <Pressable onPress={() => { hapticWarning(); onFire(); }} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
        <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
      </Pressable>
    </View>
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
        <Avatar appearance={scout.appearance} role="SCOUT" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
            {RANGE_LABEL[scout.scoutingRange]} SCOUT
          </PixelText>
          <PixelText size={7} dim style={{ marginTop: 2 }}>{scout.nationality}</PixelText>
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
    const signingFee = coach.salary * 4;
    if ((academy.balance ?? academy.totalCareerEarnings) < signingFee) {
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee);
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
    const currentBalance = academy.balance ?? 0;
    if (currentBalance < penalty) {
      setFireError(`INSUFFICIENT FUNDS — need £${penalty.toLocaleString()}`);
      setPendingFire(null);
      return;
    }
    addBalance(-penalty);
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
    const signingFee = scout.salary * 4;
    if ((academy.balance ?? academy.totalCareerEarnings) < signingFee) {
      setSignError(`INSUFFICIENT FUNDS — need £${signingFee.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFee);
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
    const currentBalance = academy.balance ?? 0;
    if (currentBalance < penalty) {
      setFireError(`INSUFFICIENT FUNDS — need £${penalty.toLocaleString()}`);
      setPendingFire(null);
      return;
    }
    addBalance(-penalty);
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
          renderItem={({ item }) => <ScoutCard scout={item} onFire={() => fireScout(item)} />}
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

function UpkeepWarningBanner() {
  const balance = useAcademyStore((s) => s.academy.balance ?? 0);
  const levels = useFacilityStore((s) => s.levels);
  const totalUpkeep = calculateTotalUpkeep(levels);

  if (totalUpkeep === 0) return null;
  const weeksUntilBroke = Math.floor(balance / totalUpkeep);
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
        £{totalUpkeep.toLocaleString()}/WK · {weeksUntilBroke}WK LEFT
      </PixelText>
    </View>
  );
}

export default function AcademyHubScreen() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('SQUAD');
  const academy = useAcademyStore((s) => s.academy);

  const balance = (typeof academy.balance === 'number' && !isNaN(academy.balance))
    ? academy.balance
    : academy.totalCareerEarnings;

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
        <PixelText size={7} color={WK.yellow}>£{balance.toLocaleString()}</PixelText>
      </View>
      <UpkeepWarningBanner />

      {activeTab === 'SQUAD' && <SquadPane />}
      {activeTab === 'COACHES' && <CoachesPane />}
      {activeTab === 'SCOUTS' && <ScoutsPane />}
    </SafeAreaView>
  );
}
