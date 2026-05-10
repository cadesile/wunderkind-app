import { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { useTickProgressStore } from '@/stores/tickProgressStore';
import { useClubStore } from '@/stores/clubStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { isJune, formatGameDate, addWeeks } from '@/utils/dateUtils';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_LABEL = 'INITIALISING';

export function WeeklyTickOverlay() {
  const isProcessing = useTickProgressStore((s) => s.isProcessing);
  const storePhase   = useTickProgressStore((s) => s.phase);
  const storePct     = useTickProgressStore((s) => s.phasePct);
  const weekNumber   = useClubStore((s) => s.club.weekNumber ?? 1);
  const gameDate     = useCalendarStore((s) => s.gameDate);

  const gameDateObj       = new Date(gameDate);
  const windowOpen        = isJune(gameDateObj);
  const currentDateLabel  = formatGameDate(gameDateObj);
  const nextDateLabel     = formatGameDate(addWeeks(gameDateObj, 1));
  const julyFirst         = new Date(gameDateObj.getFullYear(), 6, 1);
  const weeksLeftInJune   = windowOpen
    ? Math.max(1, Math.ceil((julyFirst.getTime() - gameDateObj.getTime()) / MS_PER_WEEK))
    : 0;

  const [visible, setVisible]               = useState(false);
  const [currentPhase, setCurrentPhase]     = useState(FALLBACK_LABEL);
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [dots, setDots]                     = useState('.');
  const prevPhaseRef = useRef('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnim  = useRef(new Animated.Value(0)).current;

  // ── Show / hide ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      setCompletedPhases([]);
      setCurrentPhase(FALLBACK_LABEL);
      prevPhaseRef.current = '';
      setDots('.');
      setVisible(true);
      barAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      // Snap bar to 100 %, hold briefly, then fade out
      Animated.timing(barAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      const t = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(
          ({ finished }) => { if (finished) setVisible(false); },
        );
      }, 600);
      return () => clearTimeout(t);
    }
  }, [isProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase label updates ────────────────────────────────────────────────────
  useEffect(() => {
    if (!storePhase) return;
    const prev = prevPhaseRef.current;
    if (prev && prev !== storePhase) {
      setCompletedPhases((ps) => [...ps, prev]);
    }
    prevPhaseRef.current = storePhase;
    setCurrentPhase(storePhase);
    setDots('.');
  }, [storePhase]);

  // ── Bar animation ──────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: storePct / 100,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [storePct]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dots animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '.' : d + '.')), 420);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const displayPct = Math.round(storePct);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
        backgroundColor: 'rgba(13, 46, 40, 0.97)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
      }}
    >
      {/* ── Week badge ────────────────────────────────────────────────────── */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <PixelText size={7} color={WK.dim} style={{ marginBottom: 6 }}>
          PROCESSING
        </PixelText>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.yellow,
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}>
          <PixelText size={11} color={WK.yellow}>
            {currentDateLabel}
          </PixelText>
        </View>
        <PixelText size={6} color={WK.tealLight} style={{ marginTop: 6 }}>
          → ADVANCING TO {nextDateLabel}
        </PixelText>
      </View>

      {/* ── Phase log ─────────────────────────────────────────────────────── */}
      <View style={{ width: 288, marginBottom: 20 }}>
        {completedPhases.slice(-4).map((label, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}
          >
            <PixelText size={6} color={'#4CAF50'}>✓</PixelText>
            <PixelText size={6} color={WK.dim}>{label}</PixelText>
          </View>
        ))}
        {/* Current phase */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
          <PixelText size={6} color={WK.yellow}>▶</PixelText>
          <PixelText size={6} color={WK.text}>{currentPhase}{dots}</PixelText>
        </View>
      </View>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <View
        style={{
          width: 288,
          height: 14,
          backgroundColor: WK.tealDark,
          borderWidth: 3,
          borderColor: WK.border,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            backgroundColor: WK.yellow,
            width: barAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
        {/* Segment ticks */}
        {[25, 50, 75].map((tick) => (
          <View
            key={tick}
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: `${tick}%` as unknown as number,
              width: 2,
              backgroundColor: WK.border,
              opacity: 0.5,
            }}
          />
        ))}
      </View>

      {/* ── Pct label ─────────────────────────────────────────────────────── */}
      <PixelText size={7} color={WK.dim} style={{ marginTop: 7 }}>
        {displayPct}%
      </PixelText>

      {/* ── Transfer window indicator ─────────────────────────────────────── */}
      {windowOpen && (
        <View style={{ marginTop: 18, alignItems: 'center', gap: 6 }}>
          <View style={{
            backgroundColor: WK.yellow + '22',
            borderWidth: 2,
            borderColor: WK.yellow,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'center',
            gap: 4,
          }}>
            <PixelText size={7} color={WK.yellow}>TRANSFER WINDOW OPEN</PixelText>
            <PixelText size={6} color={WK.tealLight}>
              {`WEEKS REMAINING: ${weeksLeftInJune}`}
            </PixelText>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
