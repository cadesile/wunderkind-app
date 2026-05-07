import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { useScoutStore } from '@/stores/scoutStore';
import { useCoachStore } from '@/stores/coachStore';
import { useClubStore } from '@/stores/clubStore';
import { useFinanceStore } from '@/stores/financeStore';
import { moraleLabel } from '@/utils/morale';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { Money } from '@/components/ui/Money';
import { renderMoney, penceToPounds } from '@/utils/currency';
import { AssignMissionOverlay } from '@/components/AssignMissionOverlay';

const RANGE_LABEL: Record<string, string> = {
  local: 'LOCAL',
  national: 'NATIONAL',
  international: 'INTL',
};

export default function ScoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scout = useScoutStore((s) => s.scouts.find((sc) => sc.id === id));
  const cancelMission = useScoutStore((s) => s.cancelMission);
  const removeScout = useScoutStore((s) => s.removeScout);
  const { club, addBalance } = useClubStore();
  const [missionOverlayVisible, setMissionOverlayVisible] = useState(false);
  const [releaseDialogVisible, setReleaseDialogVisible] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const dof = useCoachStore((s) => s.coaches.find((c) => c.role === 'director_of_football'));
  const dofAutoScouts = dof?.dofAutoAssignScouts ?? false;

  function confirmRelease() {
    if (!scout) return;
    const penaltyPence = Math.floor(scout.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    if (penceToPounds(club.balance ?? 0) < penaltyPounds) {
      setReleaseError(`INSUFFICIENT FUNDS — need £${penaltyPounds.toLocaleString()}`);
      setReleaseDialogVisible(false);
      return;
    }
    addBalance(-penaltyPence);
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${scout.name} (25% early termination)`,
      weekNumber: club.weekNumber ?? 1,
    });
    removeScout(scout.id);
    router.back();
  }

  if (!scout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>SCOUT NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const morale = scout.morale ?? 70;
  const isOnMission = scout.activeMission?.status === 'active';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={WK.text} />
        </Pressable>
        <PixelText size={11} upper style={{ flex: 1 }} numberOfLines={1}>{scout.name}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* Bio card */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          gap: 14,
          ...pixelShadow,
        }}>
          {scout.appearance && (
            <Avatar appearance={scout.appearance} role="SCOUT" size={64} />
          )}
          <View style={{ flex: 1 }}>
            <PixelText size={12} upper numberOfLines={2}>{scout.name}</PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Badge
                label={RANGE_LABEL[scout.scoutingRange] ?? scout.scoutingRange.toUpperCase()}
                color={scout.scoutingRange === 'local' ? 'dim' : scout.scoutingRange === 'national' ? 'yellow' : 'green'}
              />
              <FlagText nationality={scout.nationality} size={16} />
            </View>
            <PixelText size={13} variant="vt323" dim style={{ marginTop: 6 }}>{scout.nationality}</PixelText>
          </View>
        </View>

        {/* Stats card */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          ...pixelShadow,
        }}>
          <PixelText size={9} upper style={{ marginBottom: 14 }}>Scout Profile</PixelText>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>SUCCESS RATE</PixelText>
              <PixelText size={18} variant="vt323" color={WK.yellow}>{scout.successRate}%</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>WEEKLY SALARY</PixelText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Money pence={scout.salary} size={18} variant="vt323" color={WK.tealLight} />
                <PixelText size={14} variant="vt323" color={WK.tealLight} dim>/wk</PixelText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>MORALE</PixelText>
              <MoraleBar morale={morale} width={80} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <PixelText size={14} variant="vt323" dim>STATUS</PixelText>
              <PixelText size={18} variant="vt323" color={isOnMission ? WK.orange : WK.green}>
                {isOnMission ? 'ON MISSION' : 'AVAILABLE'}
              </PixelText>
            </View>
          </View>
        </View>

        {/* Active mission card */}
        {isOnMission && scout.activeMission && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.orange,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={9} upper style={{ marginBottom: 14 }}>Active Mission</PixelText>
            <View style={{ gap: 4 }}>
              {scout.activeMission.position && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                  <PixelText size={14} variant="vt323" dim>POSITION</PixelText>
                  <PixelText size={18} variant="vt323" color={WK.text}>{scout.activeMission.position}</PixelText>
                </View>
              )}
              {scout.activeMission.targetNationality && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                  <PixelText size={14} variant="vt323" dim>REGION</PixelText>
                  <PixelText size={18} variant="vt323" color={WK.text}>{scout.activeMission.targetNationality}</PixelText>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                <PixelText size={14} variant="vt323" dim>PROGRESS</PixelText>
                <PixelText size={18} variant="vt323" color={WK.yellow}>
                  Week {scout.activeMission.weeksElapsed} of {scout.activeMission.weeksTotal}
                </PixelText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                <PixelText size={14} variant="vt323" dim>GEMS FOUND</PixelText>
                <PixelText size={18} variant="vt323" color={scout.activeMission.gemsFound > 0 ? WK.green : WK.dim}>
                  {scout.activeMission.gemsFound}
                </PixelText>
              </View>
            </View>

            {/* Progress bar */}
            <View style={{
              height: 6,
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderWidth: 2,
              borderColor: WK.border,
              marginTop: 12,
            }}>
              <View style={{
                height: '100%',
                width: `${Math.min(100, (scout.activeMission.weeksElapsed / scout.activeMission.weeksTotal) * 100)}%`,
                backgroundColor: WK.orange,
              }} />
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                label="CANCEL MISSION"
                variant="red"
                fullWidth
                onPress={() => cancelMission(scout.id)}
              />
            </View>
          </View>
        )}

        {/* Assign mission button */}
        <Button
          label={isOnMission ? 'SCOUT ON MISSION' : dofAutoScouts ? 'MANAGED BY DOF' : 'ASSIGN SCOUTING MISSION'}
          variant="yellow"
          fullWidth
          disabled={isOnMission || dofAutoScouts}
          onPress={() => setMissionOverlayVisible(true)}
        />

        {/* Release */}
        {releaseError && (
          <PixelText size={6} color={WK.red} style={{ textAlign: 'center', marginTop: 4 }}>
            {releaseError}
          </PixelText>
        )}
        <Button
          label="RELEASE SCOUT"
          variant="red"
          fullWidth
          onPress={() => { setReleaseError(null); setReleaseDialogVisible(true); }}
          style={{ marginTop: 4 }}
        />

      </ScrollView>

      <PixelDialog
        visible={releaseDialogVisible}
        title="Release Scout?"
        message={scout ? <>Release {scout.name}?{'\n\n'}Early termination fee: <Money pence={Math.floor(scout.salary * 26 * 0.25)} />{'\n'}(25% of 26 remaining weeks)</> : ''}
        onClose={() => setReleaseDialogVisible(false)}
        onConfirm={confirmRelease}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />

      <AssignMissionOverlay
        scout={scout}
        visible={missionOverlayVisible}
        onClose={() => setMissionOverlayVisible(false)}
      />
    </SafeAreaView>
  );
}
