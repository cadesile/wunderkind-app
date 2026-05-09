import { useState, useMemo, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
} from 'react-native-reanimated';
import { useCalendarStore } from '@/stores/calendarStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useClubStore } from '@/stores/clubStore';
import { useLeagueStore, selectCurrentSeason } from '@/stores/leagueStore';
import { isTransferWindowOpen } from '@/utils/dateUtils';
import { formatCurrencyCompact } from '@/utils/currency';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

const SPEED        = 55; // px/s
const SEPARATOR    = '   ◆   ';
const WINDOW_LABEL = 'TRANSFER WINDOW OPEN!!';
/** Wait this long after the last segment change before starting the marquee. */
const DEBOUNCE_MS  = 400;

const TICKER_HEIGHT = 38;
const TEXT_SIZE     = 8;

function buildFee(fee: number, type?: string): string {
  if (fee === 0 || type === 'free_release') return 'FREE';
  return formatCurrencyCompact(fee);
}

interface TickerEntry {
  playerName: string;
  fromClub: string;
  toClub: string;
  fee: number;
  feeType?: string;
  week: number;
}

// ─── Marquee primitives (pattern: swmansion.com/reanimated/examples/marquee) ─

/**
 * Hidden measurement pass — wraps children in a height-0 clipping view so
 * the horizontal ScrollView inside can measure text at its natural width
 * without any wrapping or layout side-effects.
 */
function MeasureElement({
  onWidth,
  children,
}: {
  onWidth: (w: number) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ height: 0, overflow: 'hidden' }}>
      <ScrollView horizontal scrollEnabled={false} pointerEvents="none">
        <View onLayout={(e) => onWidth(e.nativeEvent.layout.width)}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

/** One absolutely-positioned clone of the content. */
function TranslatedElement({
  index,
  childrenWidth,
  offset,
  children,
}: {
  index: number;
  childrenWidth: number;
  offset: Animated.SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    left: index * childrenWidth + offset.value,
  }));
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' }, style]}>
      {children}
    </Animated.View>
  );
}

/** Drives frame-by-frame scrolling and renders N+2 clones to fill the width. */
function MarqueeScroller({
  childrenWidth,
  parentWidth,
  children,
}: {
  childrenWidth: number;
  parentWidth: number;
  children: React.ReactNode;
}) {
  const offset = useSharedValue(0);

  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame ?? 16;
    offset.value -= (SPEED * dt) / 1000;
    // Keep offset in [-childrenWidth, 0) for seamless loop
    offset.value = ((offset.value % childrenWidth) - childrenWidth) % childrenWidth;
  }, true);

  const cloneCount = Math.ceil(parentWidth / childrenWidth) + 2;

  return (
    // Explicit full-bleed container so absolute children have a clear origin
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: cloneCount }).map((_, i) => (
        <TranslatedElement
          key={i}
          index={i}
          childrenWidth={childrenWidth}
          offset={offset}
        >
          {children}
        </TranslatedElement>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransferWindowTicker() {
  const gameDate   = useCalendarStore((s) => s.gameDate);
  const windowOpen = isTransferWindowOpen(gameDate);

  const ampTransfers  = useFinanceStore((s) => s.transfers);
  const npcTransfers  = useFinanceStore((s) => s.npcTransfers);
  const ampName       = useClubStore((s) => s.club.name ?? 'ACADEMY');
  const currentSeason = useLeagueStore(selectCurrentSeason);

  // ── Merge + sort + top 5 ─────────────────────────────────────────────────
  const top5 = useMemo<TickerEntry[]>(() => {
    const ampEntries: TickerEntry[] = ampTransfers
      .filter((t) => t.season === undefined || t.season === currentSeason)
      .map((t) => ({
      playerName: t.playerName,
      fromClub:   t.direction === 'out' ? ampName : (t.fromClub ?? 'FREE AGENT'),
      toClub:     t.direction === 'out' ? t.destinationClub : ampName,
      fee:        t.grossFee,
      feeType:    t.type,
      week:       t.week,
    }));

    const npcEntries: TickerEntry[] = npcTransfers
      .filter((t) => t.season === undefined || t.season === currentSeason)
      .map((t) => ({
        playerName: t.playerName,
        fromClub:   t.fromClub,
        toClub:     t.toClub,
        fee:        t.fee,
        week:       t.week,
      }));

    return [...ampEntries, ...npcEntries]
      .sort((a, b) => b.week - a.week)
      .slice(0, 5);
  }, [ampTransfers, npcTransfers, ampName, currentSeason]);

  // ── Build full segment string ─────────────────────────────────────────────
  const segment = useMemo(() => {
    if (top5.length === 0) return `${WINDOW_LABEL}${SEPARATOR}`;

    const parts = top5.map((t) =>
      `${t.playerName.toUpperCase()} | ${t.fromClub.toUpperCase()} > ${t.toClub.toUpperCase()} | ${buildFee(t.fee, t.feeType)}`,
    );

    return `${WINDOW_LABEL}${SEPARATOR}${parts.join(SEPARATOR)}${SEPARATOR}`;
  }, [top5]);

  // ── Debounce: wait for segment to stabilise before starting the marquee ──
  // Prevents mid-scroll resets caused by Zustand hydrating from AsyncStorage.
  const [stableSegment, setStableSegment] = useState<string | null>(null);

  useEffect(() => {
    if (!windowOpen) { setStableSegment(null); return; }
    const id = setTimeout(() => setStableSegment(segment), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [segment, windowOpen]);

  // ── Dimension state ───────────────────────────────────────────────────────
  const [contentWidth, setContentWidth] = useState(0);
  const [parentWidth,  setParentWidth]  = useState(0);

  // Reset measurement when segment changes so MarqueeScroller remounts fresh
  useEffect(() => { setContentWidth(0); }, [stableSegment]);

  const scrollReady = contentWidth > 0 && parentWidth > 0 && stableSegment !== null;

  if (!windowOpen) return null;

  const tickerContent = stableSegment !== null ? (
    <PixelText size={TEXT_SIZE} color={WK.border} numberOfLines={1}>
      {stableSegment}
    </PixelText>
  ) : null;

  return (
    <View
      style={{
        height: TICKER_HEIGHT,
        backgroundColor: WK.yellow,
        overflow: 'hidden',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}
      onLayout={(e) => setParentWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={`Transfer window open. ${stableSegment ?? 'Loading transfers'}`}
      accessibilityRole="text"
    >
      {/* Loading state — shown until segment is stable */}
      {stableSegment === null && (
        <PixelText size={TEXT_SIZE} color={WK.border} style={{ textAlign: 'center' }}>
          {WINDOW_LABEL}
        </PixelText>
      )}

      {/* Invisible measurement — uses horizontal ScrollView to get natural text width */}
      {stableSegment !== null && (
        <MeasureElement onWidth={setContentWidth}>
          {tickerContent}
        </MeasureElement>
      )}

      {/* Scrolling marquee — only mounts once both dimensions are known */}
      {scrollReady && (
        <MarqueeScroller childrenWidth={contentWidth} parentWidth={parentWidth}>
          {tickerContent}
        </MarqueeScroller>
      )}
    </View>
  );
}
