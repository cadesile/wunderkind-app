import { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { WK, pixelShadow } from '@/constants/theme';
import { MoraleArrow } from '@/components/ui/MoraleArrow';
import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { useClubStore } from '@/stores/clubStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useFinanceStore } from '@/stores/financeStore';
import { Scout, MarketScout } from '@/types/market';
import { hapticWarning } from '@/utils/haptics';
import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';

const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
];

const RANGE_BADGE_COLOR: Record<Scout['scoutingRange'], 'dim' | 'yellow' | 'red'> = {
  local:         'dim',
  national:      'yellow',
  international: 'red',
};

function ScoutCard({ scout, weekNumber, onPress, onRenew, onRelease }: {
  scout: Scout; weekNumber: number; onPress: () => void; onRenew: () => void; onRelease: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const marketPlayers = useMarketStore((s) => s.players);
  const morale = scout.morale ?? 70;
  const assigned = scout.assignedPlayerIds ?? [];
  const workload = assigned.length;
  const isOnMission = scout.activeMission?.status === 'active';

  const assignedPlayerNames = assigned
    .map((id) => marketPlayers.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p!.firstName} ${p!.lastName}`);

  const weeksRemaining = scout.contractEndWeek !== undefined ? Math.max(0, scout.contractEndWeek - weekNumber) : undefined;
  const contractColor = weeksRemaining === undefined ? WK.tealLight
    : weeksRemaining <= 4  ? WK.red
    : weeksRemaining <= 12 ? WK.orange
    : WK.green;

  return (
    <Pressable onPress={onPress}>
      <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: isOnMission ? WK.orange : WK.border, padding: 12, marginBottom: 10, ...pixelShadow }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {scout.appearance && (
            <Avatar appearance={scout.appearance} role="SCOUT" size={48} morale={70} />
          )}
          <View style={{ flex: 1 }}>
            <PixelText size={8} upper numberOfLines={1}>{scout.name}</PixelText>
            <View style={{ marginTop: 2 }}>
              <Badge label={`${scout.scoutingRange.toUpperCase()} SCOUT`} color={RANGE_BADGE_COLOR[scout.scoutingRange]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <FlagText nationality={scout.nationality} size={10} />
              <PixelText size={6} dim>{scout.nationality}</PixelText>
            </View>
            <View style={{ marginTop: 4 }}>
              <Badge label={isOnMission ? 'ON MISSION' : 'AVAILABLE'} color={isOnMission ? 'yellow' : 'green'} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <MoraleArrow morale={morale} size={22} />
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: WK.border }}>
          <View style={{ alignItems: 'center' }}>
            <PixelText size={6} dim>SUCCESS RATE</PixelText>
            <PixelText size={12} color={WK.yellow} style={{ marginTop: 4 }}>{scout.successRate}%</PixelText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <PixelText size={6} dim>SALARY</PixelText>
            <PixelText size={12} color={WK.tealLight} style={{ marginTop: 4 }}>£{Math.round(scout.salary / 100)}/wk</PixelText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <PixelText size={6} dim>WORKLOAD</PixelText>
            <PixelText size={12} color={workload >= 5 ? WK.red : workload >= 3 ? WK.orange : WK.green} style={{ marginTop: 4 }}>{workload}/5</PixelText>
          </View>
        </View>

        {/* Workload bar */}
        <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border, marginTop: 8 }}>
          <View style={{ height: '100%', width: `${(workload / 5) * 100}%`, backgroundColor: workload >= 5 ? WK.red : workload >= 3 ? WK.orange : WK.green }} />
        </View>

        {/* Assignments toggle */}
        {workload > 0 && (
          <Pressable onPress={() => setExpanded((v) => !v)} style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PixelText size={6} color={WK.tealLight}>VIEW ASSIGNMENTS ({workload})</PixelText>
            <PixelText size={6} color={WK.tealLight}>{expanded ? '▼' : '▶'}</PixelText>
          </Pressable>
        )}
        {expanded && assignedPlayerNames.length > 0 && (
          <View style={{ marginTop: 8, gap: 4 }}>
            {assignedPlayerNames.map((name, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border }}>
                <PixelText size={6} color={WK.yellow} style={{ marginRight: 8 }}>◆</PixelText>
                <PixelText size={6}>{name}</PixelText>
              </View>
            ))}
          </View>
        )}

        {morale < 40 && (
          <View style={{ marginTop: 10, padding: 8, backgroundColor: 'rgba(200,30,30,0.15)', borderWidth: 2, borderColor: WK.red }}>
            <PixelText size={6} color={WK.red}>LOW MORALE — SCOUTING PAUSED</PixelText>
          </View>
        )}

        {/* Contract + actions */}
        {weeksRemaining !== undefined && (
          <PixelText size={6} color={contractColor} style={{ marginTop: 8 }}>CONTRACT: {weeksRemaining} WKS</PixelText>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Pressable onPress={(e) => { e.stopPropagation(); hapticWarning(); onRenew(); }}>
            <PixelText size={6} color={WK.yellow}>[ RENEW ]</PixelText>
          </Pressable>
          <Pressable onPress={(e) => { e.stopPropagation(); hapticWarning(); onRelease(); }}>
            <PixelText size={6} color={WK.red}>[ RELEASE ]</PixelText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function ProspectScoutCard({ scout, onSign }: { scout: MarketScout; onSign: (durationWeeks: number, signOnFeePence: number) => void }) {
  const config = useGameConfigStore((s) => s.config);
  return (
    <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.tealMid, padding: 12, marginBottom: 10, ...pixelShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.firstName} {scout.lastName}</PixelText>
          <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>{scout.scoutingRange.toUpperCase()} SCOUT</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={10} />
            <PixelText size={6} dim>{scout.nationality}</PixelText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Badge label={`${scout.successRate}% RATE`} color="yellow" />
          <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {DURATION_OPTIONS.map((opt) => {
          const fee = calculateStaffSignOnFee(scout.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
          return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => onSign(opt.weeks, fee)} />;
        })}
      </View>
    </View>
  );
}

export default function MarketScoutsScreen() {
  const router = useRouter();
  const scouts = useScoutStore((s) => s.scouts);
  const { removeScout, updateScout } = useScoutStore();
  const { marketScouts, hireScout } = useMarketStore();
  const { club } = useClubStore();
  const config = useGameConfigStore((s) => s.config);
  const { addTransaction } = useFinanceStore();

  const [showHireModal, setShowHireModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);
  const [pendingRenewScout, setPendingRenewScout] = useState<Scout | null>(null);
  const [hireError, setHireError] = useState<string | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);

  const weekNumber = club.weekNumber ?? 1;
  const prospects = marketScouts.slice(0, 3);

  const releasingScout = scouts.find((s) => s.id === pendingReleaseId) ?? null;
  const severance = releasingScout?.contractEndWeek !== undefined
    ? calculateStaffSeverance(releasingScout.salary, Math.max(0, releasingScout.contractEndWeek - weekNumber), config.staffSeverancePercent)
    : 0;

  function signScout(scout: MarketScout, durationWeeks: number, signOnFeePence: number) {
    if ((club.balance ?? 0) < signOnFeePence) {
      setHireError(`INSUFFICIENT FUNDS — need £${Math.round(signOnFeePence / 100).toLocaleString()}`);
      return;
    }
    setHireError(null);
    addTransaction({ amount: -signOnFeePence, category: 'staff_sign_on', description: `Signed ${scout.firstName} ${scout.lastName} (${durationWeeks / 52} yr)`, weekNumber });
    hireScout(scout.id, weekNumber, durationWeeks);
  }

  function confirmRelease() {
    if (!pendingReleaseId) return;
    if (severance > 0) {
      addTransaction({ amount: -severance, category: 'staff_severance', description: `Released ${releasingScout?.name ?? 'scout'}`, weekNumber });
    }
    removeScout(pendingReleaseId);
    setPendingReleaseId(null);
  }

  function renewScout(durationWeeks: number) {
    if (!pendingRenewScout) return;
    const fee = calculateStaffSignOnFee(pendingRenewScout.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < fee) {
      setRenewError(`INSUFFICIENT FUNDS — need £${Math.round(fee / 100).toLocaleString()}`);
      return;
    }
    setRenewError(null);
    addTransaction({ amount: -fee, category: 'staff_sign_on', description: `Renewed ${pendingRenewScout.name}'s contract (${durationWeeks / 52} yr)`, weekNumber });
    updateScout(pendingRenewScout.id, { contractEndWeek: weekNumber + durationWeeks, initialContractWeeks: durationWeeks });
    setShowRenewModal(false);
    setPendingRenewScout(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      <View style={{ backgroundColor: WK.tealMid, borderBottomWidth: 4, borderBottomColor: WK.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper style={{ flex: 1 }}>Scout Hub</PixelText>
        <PixelText size={7} color={WK.tealLight}>{scouts.length} SCOUTS</PixelText>
      </View>

      <View style={{ marginHorizontal: 10, marginTop: 10 }}>
        <Button label="◈ HIRE SCOUT" variant="green" fullWidth onPress={() => { setHireError(null); setShowHireModal(true); }} />
      </View>

      {scouts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <PixelText size={10} color={WK.yellow}>NO SCOUTS HIRED</PixelText>
          <PixelText size={7} dim>RECRUIT SCOUTS FROM THE MARKET</PixelText>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
          {scouts.map((scout) => (
            <ScoutCard
              key={scout.id}
              scout={scout}
              weekNumber={weekNumber}
              onPress={() => router.push(`/scout/${scout.id}`)}
              onRenew={() => { setPendingRenewScout(scout); setRenewError(null); setShowRenewModal(true); }}
              onRelease={() => setPendingReleaseId(scout.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Hire modal */}
      <Modal visible={showHireModal} transparent animationType="fade" onRequestClose={() => setShowHireModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowHireModal(false)}>
          <Pressable onPress={() => {}} style={{ width: '90%', maxHeight: '80%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 14 }}>Hire Scout</PixelText>
              {hireError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{hireError}</PixelText>}
              {prospects.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <PixelText size={7} dim>NO SCOUTS AVAILABLE</PixelText>
                  <View style={{ marginTop: 12 }}><Button label="CLOSE" variant="teal" onPress={() => setShowHireModal(false)} /></View>
                </View>
              ) : (
                <>
                  {prospects.map((s) => <ProspectScoutCard key={s.id} scout={s} onSign={(dur, fee) => signScout(s, dur, fee)} />)}
                  <Button label="CLOSE" variant="teal" fullWidth onPress={() => setShowHireModal(false)} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Renew modal */}
      <Modal visible={showRenewModal} transparent animationType="fade" onRequestClose={() => { setShowRenewModal(false); setRenewError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setShowRenewModal(false); setRenewError(null); }}>
          <Pressable onPress={() => {}} style={{ width: '90%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Renew Contract</PixelText>
              {pendingRenewScout && <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{pendingRenewScout.name}</PixelText>}
              {renewError && <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{renewError}</PixelText>}
              <View style={{ gap: 8 }}>
                {pendingRenewScout && DURATION_OPTIONS.map((opt) => {
                  const fee = calculateStaffSignOnFee(pendingRenewScout.salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
                  return <Button key={opt.weeks} label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`} variant="yellow" fullWidth onPress={() => renewScout(opt.weeks)} />;
                })}
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setShowRenewModal(false); setRenewError(null); }} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Release confirmation */}
      <PixelDialog
        visible={!!pendingReleaseId}
        title="Release Scout?"
        message={severance > 0
          ? `Releasing this scout requires a severance payout of £${Math.round(severance / 100).toLocaleString()}. Proceed?`
          : 'Are you sure you want to release this scout?'}
        onClose={() => setPendingReleaseId(null)}
        onConfirm={confirmRelease}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />
    </SafeAreaView>
  );
}
