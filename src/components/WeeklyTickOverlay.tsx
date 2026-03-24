import { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { useTickProgressStore } from '@/stores/tickProgressStore';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

const PHASES = [
  { label: 'RUNNING TRAINING SESSION',  pct: 13  },
  { label: 'CHECKING FOR INJURIES',      pct: 25  },
  { label: 'REVIEWING SQUAD BEHAVIOUR',  pct: 38  },
  { label: 'CALCULATING FINANCES',       pct: 51  },
  { label: 'DEVELOPING PLAYERS',         pct: 64  },
  { label: 'ASSESSING SQUAD MORALE',     pct: 76  },
  { label: 'CHECKING AGENT ACTIVITY',    pct: 89  },
  { label: 'ADVANCING TO NEXT WEEK',     pct: 100 },
];

const PHASE_DURATION = 220; // ms per phase → ~1.76 s total

export function WeeklyTickOverlay() {
  const isProcessing = useTickProgressStore((s) => s.isProcessing);

  const [visible, setVisible]     = useState(false);
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [tickDone, setTickDone]   = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnim  = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start / stop based on isProcessing ────────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      // Reset and show
      setPhaseIdx(0);
      setTickDone(false);
      setVisible(true);
      barAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Advance phase every PHASE_DURATION ms
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx += 1;
        if (idx >= PHASES.length) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTickDone(true);
          return;
        }
        setPhaseIdx(idx);
      }, PHASE_DURATION);
    } else {
      // Tick finished — mark done so we can close once animation is also done
      setTickDone(true);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isProcessing]);

  // ── Animate progress bar whenever phaseIdx changes ────────────────────────
  useEffect(() => {
    const target = PHASES[phaseIdx]?.pct ?? 100;
    Animated.timing(barAnim, {
      toValue: target / 100,
      duration: PHASE_DURATION - 20,
      useNativeDriver: false,
    }).start();
  }, [phaseIdx]);

  // ── Hide overlay when both animation & tick are done ──────────────────────
  useEffect(() => {
    if (!tickDone || isProcessing) return;

    // Snap bar to 100 %
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: false,
    }).start();

    // Hold at 100 % for 400 ms, then fade out
    const holdTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 400);

    return () => clearTimeout(holdTimer);
  }, [tickDone, isProcessing]);

  if (!visible) return null;

  const phase = PHASES[phaseIdx];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        backgroundColor: 'rgba(13, 46, 40, 0.96)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
      }}
    >
      {/* Title */}
      <PixelText size={9} color={WK.yellow} style={{ marginBottom: 28, textAlign: 'center' }}>
        PROCESSING WEEK
      </PixelText>

      {/* Phase label */}
      <View style={{ height: 32, justifyContent: 'center', marginBottom: 20, paddingHorizontal: 24 }}>
        <PixelText size={7} color={WK.text} style={{ textAlign: 'center', lineHeight: 14 }}>
          {phase?.label ?? 'ADVANCING TO NEXT WEEK'}
        </PixelText>
      </View>

      {/* Progress bar */}
      <View
        style={{
          width: 260,
          height: 18,
          backgroundColor: WK.tealDark,
          borderWidth: 3,
          borderColor: WK.border,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: WK.yellow,
            width: barAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>

      {/* Percentage label */}
      <PixelText size={8} dim style={{ marginTop: 8 }}>
        {`${phase?.pct ?? 100}%`}
      </PixelText>

      {/* Blinking dots */}
      <BlinkingDots />
    </Animated.View>
  );
}

function BlinkingDots() {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ flexDirection: 'row', gap: 6, marginTop: 28, opacity: opacityAnim }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{ width: 8, height: 8, backgroundColor: WK.yellow, borderWidth: 1, borderColor: WK.border }}
        />
      ))}
    </Animated.View>
  );
}
