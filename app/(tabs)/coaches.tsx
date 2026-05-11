import { useState } from 'react';
import { View, FlatList, Modal, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useCoachStore } from '@/stores/coachStore';
import { useClubStore } from '@/stores/clubStore';
import { useMarketStore } from '@/stores/marketStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { generateAppearance } from '@/engine/appearance';
import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';
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

const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
];

// ─── Coach card ───────────────────────────────────────────────────────────────

function CoachCard({ coach, weekNumber, onFire, onRenew }: { coach: Coach; weekNumber: number; onFire: () => void; onRenew: () => void }) {
  const weeksRemaining = coach.contractEndWeek !== undefined ? Math.max(0, coach.contractEndWeek - weekNumber) : undefined;
  const contractColor = weeksRemaining === undefined ? WK.tealLight : weeksRemaining <= 4 ? WK.red : weeksRemaining <= 12 ? WK.orange : WK.green;
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Avatar appearance={coach.appearance} role="COACH" size={44} morale={coach.morale ?? 70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.name}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.replace(/_/g, ' ').toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
          {weeksRemaining !== undefined && (
            <PixelText size={6} color={contractColor} style={{ marginTop: 2 }}>CONTRACT: {weeksRemaining} WKS</PixelText>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`INF ${coach.influence}`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(Object.entries(coach.specialisms) as [string, number][]).map(([key, val]) => (
            <Badge key={key} label={key.toUpperCase()} color={val >= 70 ? 'green' : val >= 40 ? 'yellow' : 'dim'} />
          ))}
        </View>
      )}
      <View style={{ marginTop: 8 }}>
        <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
          <View style={{ height: '100%', width: `${(coach.influence / 20) * 100}%`, backgroundColor: traitColor(coach.influence) }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
        <Pressable onPress={() => { hapticWarning(); onRenew(); }}>
          <PixelText size={6} color={WK.yellow}>[ RENEW ]</PixelText>
        </Pressable>
        <Pressable onPress={() => { hapticWarning(); onFire(); }}>
          <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Prospect card ────────────────────────────────────────────────────────────

function ProspectCard({
  coach,
  onSign,
}: {
  coach: MarketCoach;
  onSign: (durationWeeks: number, signOnFeePence: number) => void;
}) {
  const config = useGameConfigStore((s) => s.config);
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.tealMid, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <Avatar appearance={generateAppearance(coach.id, 'COACH', 35)} role="COACH" size={44} morale={70} />
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{coach.firstName} {coach.lastName}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{coach.role.replace(/_/g, ' ').toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={coach.nationality} size={12} />
            <PixelText size={7} dim>{coach.nationality}</PixelText>
          </View>
        </View>
        <Badge label={`INF ${coach.influence}`} color="green" />
      </View>
      <PixelText size={6} dim style={{ marginBottom: 6 }}>SALARY: £{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
      <View style={{ gap: 6 }}>
        {DURATION_OPTIONS.map((opt) => {
          const fee = calculateStaffSignOnFee(coach.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
          return (
            <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => onSign(opt.weeks, fee)} />
          );
        })}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const { coaches, removeCoach, updateCoach } = useCoachStore();
  const { club } = useClubStore();
  const { coaches: marketCoaches, hireCoach } = useMarketStore();
  const config = useGameConfigStore((s) => s.config);
  const { addTransaction } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [pendingFireId, setPendingFireId] = useState<string | null>(null);
  const [pendingRenewCoach, setPendingRenewCoach] = useState<Coach | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const weekNumber = club.weekNumber ?? 1;
  const totalInfluence = coaches.reduce((s, c) => s + c.influence, 0);
  const totalSalary = coaches.reduce((s, c) => s + c.salary, 0);
  const prospects = marketCoaches.slice(0, 3);

  const firingCoach = coaches.find((c) => c.id === pendingFireId) ?? null;
  const severance = firingCoach?.contractEndWeek !== undefined
    ? calculateStaffSeverance(firingCoach.salary, Math.max(0, firingCoach.contractEndWeek - weekNumber), config.staffSeverancePercent)
    : 0;

  function signCoach(coach: MarketCoach, durationWeeks: number, signOnFeePence: number) {
    if ((club.balance ?? 0) < signOnFeePence) {
      setSignError(`INSUFFICIENT FUNDS — need £${Math.round(signOnFeePence / 100).toLocaleString()}`);
      return;
    }
    setSignError(null);
    addTransaction({ amount: -signOnFeePence, category: 'staff_sign_on', description: `Signed ${coach.firstName} ${coach.lastName} (${durationWeeks / 52} yr)`, weekNumber });
    hireCoach(coach.id, weekNumber, durationWeeks);
  }

  function confirmFire() {
    if (!pendingFireId) return;
    if (severance > 0) {
      addTransaction({ amount: -severance, category: 'staff_severance', description: `Released ${firingCoach?.name ?? 'staff'}`, weekNumber });
    }
    removeCoach(pendingFireId);
    setPendingFireId(null);
  }

  function renewCoach(durationWeeks: number) {
    if (!pendingRenewCoach) return;
    const fee = calculateStaffSignOnFee(pendingRenewCoach.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${Math.round(fee / 100).toLocaleString()}`);
      return;
    }
    setSignError(null);
    addTransaction({ amount: -fee, category: 'staff_sign_on', description: `Renewed ${pendingRenewCoach.name}'s contract (${durationWeeks / 52} yr)`, weekNumber });
    updateCoach(pendingRenewCoach.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    setShowRenewModal(false);
    setPendingRenewCoach(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />
      {/* Header */}
      <View style={{ backgroundColor: WK.tealMid, borderBottomWidth: 4, borderBottomColor: WK.border, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <PixelText size={10} upper>Coaches</PixelText>
        <PixelText size={8} color={WK.yellow}>{coaches.length} STAFF</PixelText>
      </View>

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginTop: 10, gap: 10 }}>
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
        <Button label="◈ SCOUT PROSPECTS" variant="green" fullWidth onPress={() => { setSignError(null); setShowModal(true); }} />
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
          renderItem={({ item }) => (
            <CoachCard
              coach={item}
              weekNumber={weekNumber}
              onFire={() => setPendingFireId(item.id)}
              onRenew={() => { setPendingRenewCoach(item); setSignError(null); setShowRenewModal(true); }}
            />
          )}
          contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        />
      )}

      {/* Prospect modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 14 }}>Review Prospects</PixelText>
              {prospects.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>NO COACHES AVAILABLE</PixelText>
                  <PixelText size={6} dim style={{ marginTop: 6 }}>Check back after the market refreshes</PixelText>
                  <View style={{ marginTop: 12 }}><Button label="CLOSE" variant="teal" onPress={() => setShowModal(false)} /></View>
                </View>
              ) : (
                <>
                  {signError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{signError}</PixelText>}
                  {prospects.map((c) => (
                    <ProspectCard key={c.id} coach={c} onSign={(dur, fee) => signCoach(c, dur, fee)} />
                  ))}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Renew modal */}
      <Modal visible={showRenewModal} transparent animationType="fade" onRequestClose={() => { setShowRenewModal(false); setSignError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setShowRenewModal(false); setSignError(null); }}>
          <Pressable onPress={() => {}} style={{ width: '90%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Renew Contract</PixelText>
              {pendingRenewCoach && <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{pendingRenewCoach.name}</PixelText>}
              {signError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{signError}</PixelText>}
              <View style={{ gap: 8 }}>
                {pendingRenewCoach && DURATION_OPTIONS.map((opt) => {
                  const fee = calculateStaffSignOnFee(pendingRenewCoach.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
                  return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => renewCoach(opt.weeks)} />;
                })}
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setShowRenewModal(false); setSignError(null); }} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fire confirmation dialog */}
      <PixelDialog
        visible={!!pendingFireId}
        title="Release Coach?"
        message={severance > 0
          ? `Releasing this coach requires a severance payout of £${Math.round(severance / 100).toLocaleString()}. Proceed?`
          : 'Are you sure you want to release this coach?'}
        onClose={() => setPendingFireId(null)}
        onConfirm={confirmFire}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />
    </SafeAreaView>
  );
}
