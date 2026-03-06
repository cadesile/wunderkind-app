import { useState } from 'react';
import { View, FlatList, Modal, Pressable, Alert } from 'react-native';
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
import { PixelText } from '@/components/ui/PixelText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {player.age}</PixelText>
            <ArchetypeBadge player={player} />
          </View>
          <PixelText size={7} dim>{player.nationality}</PixelText>
          <View style={{ marginTop: 6, flexDirection: 'row', gap: 2 }}>
            {traits.map((v, i) => (
              <View key={i} style={{ flex: 1, height: 4, backgroundColor: traitColor(v) }} />
            ))}
          </View>
          <PixelText size={7} dim style={{ marginTop: 3 }}>AVG TRAIT: {avgTrait}/20</PixelText>
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
              onPress={() => setPosFilter(pos)}
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

  function fireCoach(coach: Coach) {
    const penaltyPence = Math.floor(coach.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    const currentBalance = academy.balance ?? 0;

    Alert.alert(
      'Release Coach?',
      `Release ${coach.name}?\n\nEarly termination fee: £${penaltyPounds.toLocaleString()}\n(25% of 26 remaining weeks @ £${Math.round(coach.salary / 100)}/wk)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: () => {
            if (currentBalance < penaltyPounds) {
              Alert.alert('Insufficient Funds', `You need £${penaltyPounds.toLocaleString()} to release this coach.`);
              return;
            }
            addBalance(-penaltyPounds);
            useFinanceStore.getState().addTransaction({
              amount: -penaltyPence,
              category: 'contract_termination',
              description: `Released ${coach.name} (25% early termination)`,
              weekNumber,
            });
            removeCoach(coach.id);
          },
        },
      ],
    );
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

  function fireScout(scout: Scout) {
    const penaltyPence = Math.floor(scout.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    const currentBalance = academy.balance ?? 0;

    Alert.alert(
      'Release Scout?',
      `Release ${scout.name}?\n\nEarly termination fee: £${penaltyPounds.toLocaleString()}\n(25% of 26 remaining weeks @ £${Math.round(scout.salary / 100)}/wk)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: () => {
            if (currentBalance < penaltyPounds) {
              Alert.alert('Insufficient Funds', `You need £${penaltyPounds.toLocaleString()} to release this scout.`);
              return;
            }
            addBalance(-penaltyPounds);
            useFinanceStore.getState().addTransaction({
              amount: -penaltyPence,
              category: 'contract_termination',
              description: `Released ${scout.name} (25% early termination)`,
              weekNumber,
            });
            removeScout(scout.id);
          },
        },
      ],
    );
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      <PixelTopTabBar
        tabs={[...ACADEMY_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as AcademyTab)}
      />
      <UpkeepWarningBanner />

      {activeTab === 'SQUAD' && <SquadPane />}
      {activeTab === 'COACHES' && <CoachesPane />}
      {activeTab === 'SCOUTS' && <ScoutsPane />}
    </SafeAreaView>
  );
}
