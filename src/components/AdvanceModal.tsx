import { useState } from 'react';
import { View, Modal, Pressable, ActivityIndicator } from 'react-native';
import { processWeeklyTick } from '@/engine/GameLoop';
import { syncQueue } from '@/api/syncQueue';
import { useAcademyStore } from '@/stores/academyStore';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { WeeklyTick } from '@/types/game';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Phase = 'menu' | 'loading' | 'summary';

export function AdvanceModal({ visible, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [tick, setTick] = useState<WeeklyTick | null>(null);


  function reset() {
    setPhase('menu');
    setTick(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleAdvanceDay() {
    // Visual-only: no game state changes
    handleClose();
  }

  function handleAdvanceWeek() {
    setPhase('loading');

    // processWeeklyTick() is synchronous — mutates Zustand stores immediately
    const result = processWeeklyTick();
    setTick(result);
    setPhase('summary');

    // Hand off to the background queue — non-blocking, persisted, rollback-safe
    const { academy } = useAcademyStore.getState();
    syncQueue.enqueue({
      weekNumber: result.week,
      clientTimestamp: result.processedAt,
      earningsDelta: Math.max(0, result.financialSummary.net),
      reputationDelta: result.reputationDelta,
      hallOfFamePoints: academy.hallOfFamePoints,
      transfers: [],
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }}
        onPress={phase === 'menu' ? handleClose : undefined}
      >
        <Pressable onPress={() => {}} style={{ width: '86%' }}>
          {/* Panel */}
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.yellow,
            padding: 20,
            ...pixelShadow,
          }}>
            {/* Title */}
            <PixelText size={10} upper style={{ textAlign: 'center', marginBottom: 18 }}>
              Advance Time
            </PixelText>

            {phase === 'loading' && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="large" color={WK.yellow} />
                <PixelText size={7} dim style={{ marginTop: 12 }}>PROCESSING WEEK…</PixelText>
              </View>
            )}

            {phase === 'summary' && tick && (
              <View>
                <PixelText size={8} color={WK.tealLight} upper style={{ marginBottom: 12 }}>WK {tick.week} Complete</PixelText>

                <SummaryRow label="XP GAINED" value={`${tick.weeklyXP.toFixed(1)} pts`} color={WK.green} />
                <SummaryRow
                  label="FINANCES"
                  value={`${tick.financialSummary.net >= 0 ? '+' : ''}£${tick.financialSummary.net.toLocaleString()}`}
                  color={tick.financialSummary.net >= 0 ? WK.green : WK.red}
                />
                <SummaryRow label="REP GAINED" value={`+${tick.reputationDelta}`} color={WK.tealLight} />
                {tick.injuredPlayerIds.length > 0 && (
                  <SummaryRow label="INJURIES" value={String(tick.injuredPlayerIds.length)} color={WK.orange} />
                )}
                {tick.incidents.length > 0 && (
                  <SummaryRow label="INCIDENTS" value={String(tick.incidents.length)} color={WK.yellow} />
                )}

                <View style={{ marginTop: 16 }}>
                  <Button label="OK" variant="yellow" fullWidth onPress={handleClose} />
                </View>
              </View>
            )}

            {phase === 'menu' && (
              <View style={{ gap: 10 }}>
                <Button label="▶ Advance 1 Day" variant="teal" fullWidth onPress={handleAdvanceDay} />
                <Button label="▶▶ Advance 1 Week" variant="yellow" fullWidth onPress={handleAdvanceWeek} />
                <View style={{ height: 2, backgroundColor: WK.border, marginVertical: 4 }} />
                <Button label="✕ Cancel" variant="teal" fullWidth onPress={handleClose} />
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={6} dim>{label}</PixelText>
      <PixelText size={6} color={color}>{value}</PixelText>
    </View>
  );
}
