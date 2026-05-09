import { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useCalendarStore } from '@/stores/calendarStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { formatGameDate } from '@/utils/dateUtils';
import { hapticPress } from '@/utils/haptics';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

const FADE_TO_BLACK_MS = 500;
const COUNTER_MS       = 2500;
const COUNTER_STEPS    = 30;
const FLASH_IN_MS      = 200;
const FLASH_OUT_MS     = 300;
const RESULT_DELAY_MS  = 300;   // after flash starts
const RESULT_FADE_MS   = 500;
const HOLD_MS          = 1800;

export function TimeSkipAnimation({ visible, onComplete }: Props) {
  const skipToNextJune = useCalendarStore((s) => s.skipToNextJune);
  const currentSeason  = useLeagueStore((s) => s.currentSeason);

  const [displayDate,   setDisplayDate]   = useState('');
  const [targetDateStr, setTargetDateStr] = useState('');

  const blackAlpha   = useSharedValue(0);
  const flashAlpha   = useSharedValue(0);
  const counterAlpha = useSharedValue(0);
  const resultAlpha  = useSharedValue(0);

  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const blackStyle   = useAnimatedStyle(() => ({ opacity: blackAlpha.value }));
  const flashStyle   = useAnimatedStyle(() => ({ opacity: flashAlpha.value }));
  const counterStyle = useAnimatedStyle(() => ({ opacity: counterAlpha.value }));
  const resultStyle  = useAnimatedStyle(() => ({ opacity: resultAlpha.value }));

  function addTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function cleanup() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    stopInterval();
    blackAlpha.value   = 0;
    flashAlpha.value   = 0;
    counterAlpha.value = 0;
    resultAlpha.value  = 0;
  }

  useEffect(() => {
    if (!visible) return;

    // ── Capture start date → advance calendar ──────────────────────────────
    const startDate = new Date(useCalendarStore.getState().gameDate);
    skipToNextJune();
    const targetDate = new Date(useCalendarStore.getState().gameDate);
    const targetStr  = formatGameDate(targetDate);
    setTargetDateStr(targetStr);
    setDisplayDate(formatGameDate(startDate));

    // Build interpolated date steps for the counter
    const totalMs = targetDate.getTime() - startDate.getTime();
    const dateSteps: string[] = Array.from({ length: COUNTER_STEPS + 1 }, (_, i) =>
      formatGameDate(new Date(startDate.getTime() + (totalMs * i) / COUNTER_STEPS)),
    );

    // ── Phase 1 (0 ms): fade to black ─────────────────────────────────────
    blackAlpha.value = withTiming(1, { duration: FADE_TO_BLACK_MS, easing: Easing.out(Easing.quad) });

    // ── Phase 2 (500 ms): show date counter, start cycling ────────────────
    addTimer(() => {
      counterAlpha.value = withTiming(1, { duration: 200 });
      let step = 0;
      intervalRef.current = setInterval(() => {
        step++;
        if (step >= dateSteps.length) {
          stopInterval();
          setDisplayDate(targetStr);
        } else {
          setDisplayDate(dateSteps[step]);
        }
      }, COUNTER_MS / COUNTER_STEPS);
    }, FADE_TO_BLACK_MS);

    // ── Phase 3 (3000 ms): white flash + haptic ───────────────────────────
    const flashStart = FADE_TO_BLACK_MS + COUNTER_MS;
    addTimer(() => {
      stopInterval();
      setDisplayDate(targetStr);
      hapticPress();
      counterAlpha.value = withTiming(0, { duration: 150 });
      flashAlpha.value   = withSequence(
        withTiming(1, { duration: FLASH_IN_MS }),
        withTiming(0, { duration: FLASH_OUT_MS }),
      );
    }, flashStart);

    // ── Phase 4 (3300 ms): reveal "SEASON N BEGINS" ───────────────────────
    addTimer(() => {
      resultAlpha.value = withTiming(1, { duration: RESULT_FADE_MS, easing: Easing.out(Easing.quad) });
    }, flashStart + RESULT_DELAY_MS);

    // ── Phase 5 (5100 ms): dismiss ────────────────────────────────────────
    addTimer(() => {
      onComplete();
    }, flashStart + RESULT_DELAY_MS + RESULT_FADE_MS + HOLD_MS);

    return cleanup;
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* ── Black backdrop ─────────────────────────────────────────────── */}
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* ── Date counter ───────────────────────────────────────────────── */}
        <Animated.View
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center', alignItems: 'center',
          }, counterStyle]}
        >
          <PixelText size={7} color={WK.dim} style={{ marginBottom: 20, letterSpacing: 2 }}>
            ADVANCING TIME
          </PixelText>

          {/* Date dial */}
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 4,
            borderColor: WK.yellow,
            paddingHorizontal: 28,
            paddingVertical: 18,
            alignItems: 'center',
            minWidth: 260,
          }}>
            {/* Scanline accent bar */}
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3, backgroundColor: WK.yellow, opacity: 0.4,
            }} />
            <PixelText size={5} color={WK.tealLight} style={{ marginBottom: 10 }}>
              GAME DATE
            </PixelText>
            <PixelText size={11} color={WK.yellow}>
              {displayDate}
            </PixelText>
          </View>

          <PixelText size={6} color={WK.tealLight} style={{ marginTop: 18 }}>
            ▶▶ FAST FORWARDING
          </PixelText>
        </Animated.View>

        {/* ── White flash ────────────────────────────────────────────────── */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#ffffff',
          }, flashStyle]}
        />

        {/* ── Result reveal ──────────────────────────────────────────────── */}
        <Animated.View
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center', alignItems: 'center', gap: 0,
          }, resultStyle]}
        >
          <PixelText size={7} color={WK.tealLight} style={{ marginBottom: 14 }}>
            SEASON {currentSeason} BEGINS
          </PixelText>

          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 4,
            borderColor: WK.yellow,
            paddingHorizontal: 28,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
            <PixelText size={12} color={WK.yellow}>
              {targetDateStr}
            </PixelText>
          </View>

          <View style={{
            marginTop: 24,
            borderWidth: 2,
            borderColor: WK.tealLight,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'center',
          }}>
            <PixelText size={6} color={WK.tealLight}>TRANSFER WINDOW OPEN</PixelText>
          </View>
        </Animated.View>

      </View>
    </Modal>
  );
}
