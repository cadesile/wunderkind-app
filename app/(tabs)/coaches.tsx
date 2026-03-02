import { useState } from 'react';
import { View, FlatList, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoachStore } from '@/stores/coachStore';
import { useAcademyStore } from '@/stores/academyStore';
import { generateCoachProspects } from '@/engine/recruitment';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { Coach } from '@/types/coach';

// ─── Coach card ───────────────────────────────────────────────────────────────

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <PixelText size={7} dim style={{ marginTop: 2 }}>{coach.nationality}</PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{coach.salary.toLocaleString()}/wk</PixelText>
        </View>
      </View>
      {/* Influence bar */}
      <View style={{ marginTop: 8 }}>
        <View style={{
          height: 5,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderWidth: 2,
          borderColor: WK.border,
        }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>
      </View>
      <Pressable onPress={onFire} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
        <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
      </Pressable>
    </View>
  );
}

// ─── Prospect card ────────────────────────────────────────────────────────────

function ProspectCard({ coach, onSign }: { coach: Coach; onSign: () => void }) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.tealMid,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const { coaches, addCoach, removeCoach } = useCoachStore();
  const { academy, addEarnings } = useAcademyStore();
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
    const signingFee = coach.salary * 4; // one month upfront
    if (academy.totalCareerEarnings < signingFee) {
      Alert.alert('Insufficient Funds', `You need £${signingFee.toLocaleString()} to sign this coach.`);
      return;
    }
    addEarnings(-signingFee);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
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
        <PixelText size={10} upper>Coaches</PixelText>
        <PixelText size={8} color={WK.yellow}>{coaches.length} STAFF</PixelText>
      </View>

      {/* Stats strip */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 10,
        marginTop: 10,
        gap: 10,
      }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>TOTAL INFLUENCE</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{totalInfluence}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>WEEKLY COST</PixelText>
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{totalSalary.toLocaleString()}</PixelText>
        </Card>
      </View>

      {/* Scout button */}
      <View style={{ marginHorizontal: 10, marginTop: 10 }}>
        <Button label="◈ SCOUT PROSPECTS" variant="green" fullWidth onPress={openScout} />
      </View>

      {/* Coach list */}
      {coaches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO COACHES SIGNED</PixelText>
          <PixelText size={7} dim style={{ marginTop: 8 }}>Scout to find talent</PixelText>
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CoachCard coach={item} onFire={() => fireCoach(item.id)} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}

      {/* Prospect modal */}
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
                    <ProspectCard key={c.id} coach={c} onSign={() => signCoach(c)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
