import { useState } from 'react';
import { View, FlatList, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useAcademyStore } from '@/stores/academyStore';
import { generateCoachProspects, generateScoutProspects } from '@/engine/recruitment';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { Player } from '@/types/player';
import { Coach } from '@/types/coach';
import { Scout } from '@/types/market';

const ACADEMY_TABS = ['SQUAD', 'COACHES', 'SCOUTS'] as const;
type AcademyTab = typeof ACADEMY_TABS[number];

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: Player }) {
  const router = useRouter();
  const traits = Object.values(player.personality);
  const avgTrait = Math.round(traits.reduce((a, b) => a + b, 0) / traits.length);

  return (
    <Pressable onPress={() => router.push(`/player/${player.id}`)}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...pixelShadow,
      }}>
        <Avatar appearance={player.appearance} role="PLAYER" size={44} />
        <View style={{ flex: 1 }}>
          <PixelText size={9} upper style={{ marginBottom: 2 }}>{player.name}</PixelText>
          <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {player.age}</PixelText>
          <PixelText size={7} dim>{player.nationality}</PixelText>
          <View style={{ marginTop: 6, flexDirection: 'row', gap: 2 }}>
            {traits.map((v, i) => (
              <View key={i} style={{ flex: 1, height: 4, backgroundColor: traitColor(v) }} />
            ))}
          </View>
          <PixelText size={7} dim style={{ marginTop: 3 }}>AVG TRAIT: {avgTrait}/20</PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={`${player.overallRating}`} color="yellow" />
          <PixelText size={8} color={WK.yellow}>{'★'.repeat(player.potential)}</PixelText>
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
          <PixelText size={6} dim>£{coach.salary.toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>
      </View>
      <Pressable onPress={onFire} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
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
      <PixelText size={6} dim>SALARY: £{coach.salary.toLocaleString()}/wk</PixelText>
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
          <PixelText size={6} dim>£{scout.salary.toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${scout.successRate}%`, backgroundColor: traitColor(Math.round(scout.successRate / 5)) }} />
        </View>
      </View>
      <Pressable onPress={onFire} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
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
      <PixelText size={6} dim>SALARY: £{scout.salary.toLocaleString()}/wk</PixelText>
      <View style={{ marginTop: 8 }}>
        <Button label="RECRUIT" variant="yellow" fullWidth onPress={onSign} />
      </View>
    </View>
  );
}

// ─── Panes ────────────────────────────────────────────────────────────────────

function SquadPane() {
  const players = useSquadStore((s) => s.players);
  if (players.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>NO PLAYERS YET</PixelText>
      </View>
    );
  }
  return (
    <FlatList
      data={players}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PlayerCard player={item} />}
      contentContainerStyle={{ padding: 10 }}
    />
  );
}

function CoachesPane() {
  const { coaches, addCoach, removeCoach } = useCoachStore();
  const { academy, addBalance } = useAcademyStore();
  const [showModal, setShowModal] = useState(false);
  const [prospects, setProspects] = useState<Coach[]>([]);

  const weekNumber = academy.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);

  function openScout() {
    setProspects(generateCoachProspects(3, weekNumber));
    setShowModal(true);
  }

  function signCoach(coach: Coach) {
    const signingFee = coach.salary * 4;
    if ((academy.balance ?? academy.totalCareerEarnings) < signingFee) {
      Alert.alert('Insufficient Funds', `You need £${signingFee.toLocaleString()} to sign this coach.`);
      return;
    }
    addBalance(-signingFee);
    addCoach({ ...coach, joinedWeek: weekNumber });
    setProspects((prev) => prev.filter((p) => p.id !== coach.id));
  }

  function fireCoach(id: string) {
    Alert.alert('Release Coach', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Release', style: 'destructive', onPress: () => removeCoach(id) },
    ]);
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
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{totalSalary.toLocaleString()}</PixelText>
        </Card>
      </View>

      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <Button label="◈ SCOUT PROSPECTS" variant="green" fullWidth onPress={openScout} />
      </View>

      {coaches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO COACHES SIGNED</PixelText>
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CoachCard coach={item} onFire={() => fireCoach(item.id)} />}
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
    </View>
  );
}

function ScoutsPane() {
  const { scouts, addScout, removeScout } = useScoutStore();
  const { academy, addBalance } = useAcademyStore();
  const [showModal, setShowModal] = useState(false);
  const [prospects, setProspects] = useState<Scout[]>([]);

  const weekNumber = academy.weekNumber ?? 1;
  const totalSalary = scouts.reduce((s, sc) => s + sc.salary, 0);

  function openRecruit() {
    setProspects(generateScoutProspects(3, weekNumber));
    setShowModal(true);
  }

  function signScout(scout: Scout) {
    const signingFee = scout.salary * 4;
    if ((academy.balance ?? academy.totalCareerEarnings) < signingFee) {
      Alert.alert('Insufficient Funds', `You need £${signingFee.toLocaleString()} to recruit this scout.`);
      return;
    }
    addBalance(-signingFee);
    addScout({ ...scout, joinedWeek: weekNumber });
    setProspects((prev) => prev.filter((p) => p.id !== scout.id));
  }

  function fireScout(id: string) {
    Alert.alert('Release Scout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Release', style: 'destructive', onPress: () => removeScout(id) },
    ]);
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
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{totalSalary.toLocaleString()}</PixelText>
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
          renderItem={({ item }) => <ScoutCard scout={item} onFire={() => fireScout(item.id)} />}
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
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AcademyHubScreen() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('SQUAD');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...ACADEMY_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as AcademyTab)}
      />

      {activeTab === 'SQUAD' && <SquadPane />}
      {activeTab === 'COACHES' && <CoachesPane />}
      {activeTab === 'SCOUTS' && <ScoutsPane />}
    </SafeAreaView>
  );
}
