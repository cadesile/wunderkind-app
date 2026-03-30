import { useState } from 'react';
import { View, FlatList, Modal, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useCoachStore } from '@/stores/coachStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useMarketStore } from '@/stores/marketStore';
import { generateAppearance } from '@/engine/appearance';
import { Avatar } from '@/components/ui/Avatar';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { hapticWarning } from '@/utils/haptics';
import { Coach } from '@/types/coach';
import { MarketCoach } from '@/types/market';

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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Avatar appearance={coach.appearance} role="COACH" size={44} morale={coach.morale ?? 70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{coach.salary.toLocaleString()}/wk</PixelText>
        </View>
      </View>
      {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(Object.entries(coach.specialisms) as [string, number][]).map(([key, val]) => (
            <Badge
              key={key}
              label={key.toUpperCase()}
              color={val >= 70 ? 'green' : val >= 40 ? 'yellow' : 'dim'}
            />
          ))}
        </View>
      )}
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
      <Pressable onPress={() => { hapticWarning(); onFire(); }} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
        <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
      </Pressable>
    </View>
  );
}

// ─── Prospect card ────────────────────────────────────────────────────────────

function ProspectCard({ coach, onSign }: { coach: MarketCoach; onSign: () => void }) {
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
        <Avatar appearance={generateAppearance(coach.id, 'COACH', 35)} role="COACH" size={44} morale={70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.firstName} {coach.lastName}</PixelText>
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const { coaches, removeCoach } = useCoachStore();
  const { academy, addBalance } = useAcademyStore();
  const { coaches: marketCoaches, hireCoach } = useMarketStore();
  const [showModal, setShowModal] = useState(false);

  const weekNumber = academy.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);
  const [signError, setSignError] = useState<string | null>(null);
  const [pendingFireId, setPendingFireId] = useState<string | null>(null);

  // Show up to 3 coaches from the market pool
  const prospects = marketCoaches.slice(0, 3);

  function openScout() {
    setSignError(null);
    setShowModal(true);
  }

  function signCoach(coach: MarketCoach) {
    // salary is in pence; balance is in whole pounds — convert before comparing/deducting
    const signingFeePounds = Math.round((coach.salary * 4) / 100);
    if ((academy.balance ?? 0) < signingFeePounds) {
      setSignError(`INSUFFICIENT FUNDS — need £${signingFeePounds.toLocaleString()}`);
      return;
    }
    setSignError(null);
    addBalance(-signingFeePounds);
    hireCoach(coach.id, weekNumber);
  }

  function fireCoach(id: string) {
    setPendingFireId(id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
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
          <PixelText size={10} color={WK.orange} style={{ marginTop: 4 }}>£{Math.round(totalSalary / 100).toLocaleString()}</PixelText>
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
          contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
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
                  <PixelText size={7} dim>NO COACHES AVAILABLE</PixelText>
                  <PixelText size={6} dim style={{ marginTop: 6 }}>Check back after the market refreshes</PixelText>
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
                    <ProspectCard key={c.id} coach={c} onSign={() => signCoach(c)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fire confirmation dialog */}
      <PixelDialog
        visible={!!pendingFireId}
        title="Release Coach?"
        message="Are you sure you want to release this coach?"
        onClose={() => setPendingFireId(null)}
        onConfirm={() => { removeCoach(pendingFireId!); setPendingFireId(null); }}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />
    </SafeAreaView>
  );
}
