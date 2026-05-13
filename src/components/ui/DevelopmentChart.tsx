import { useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Rect } from 'react-native-svg';
import { PixelText } from './PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { DevelopmentSnapshot } from '@/types/player';

// ─── Series config ─────────────────────────────────────────────────────────────

const SERIES = [
  { key: 'ovr',       label: 'OVR', color: '#f5c842', getValue: (s: DevelopmentSnapshot) => s.overallRating },
  { key: 'pace',      label: 'PAC', color: '#4ade80', getValue: (s: DevelopmentSnapshot) => s.attributes.pace },
  { key: 'technical', label: 'TEC', color: '#4db8a8', getValue: (s: DevelopmentSnapshot) => s.attributes.technical },
  { key: 'vision',    label: 'VIS', color: '#e07830', getValue: (s: DevelopmentSnapshot) => s.attributes.vision },
  { key: 'power',     label: 'POW', color: '#c03030', getValue: (s: DevelopmentSnapshot) => s.attributes.power },
  { key: 'stamina',   label: 'STA', color: '#a78bfa', getValue: (s: DevelopmentSnapshot) => s.attributes.stamina },
  { key: 'heart',     label: 'HRT', color: '#f472b6', getValue: (s: DevelopmentSnapshot) => s.attributes.heart },
] as const;

type SeriesKey = typeof SERIES[number]['key'];

const ATTRIBUTE_KEYS: SeriesKey[] = ['pace', 'technical', 'vision', 'power', 'stamina', 'heart'];

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  log: DevelopmentSnapshot[];
}

export function DevelopmentChart({ log }: Props) {
  const [expanded, setExpanded] = useState(false);
  // Default to OVR-only; attributes are opt-in via legend toggles
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set(ATTRIBUTE_KEYS));
  const { width: screenWidth } = useWindowDimensions();

  if (log.length < 3) return null;

  // Y-axis ceiling: latest OVR rounded up to nearest 10, plus 10
  // e.g. OVR=27 → ceil(27/10)*10 = 30, +10 = 40
  const latestOvr = log[log.length - 1].overallRating;
  const yMax = Math.ceil(latestOvr / 10) * 10 + 10;

  // Chart geometry — matches card structure (10px scroll padding + 14px card padding each side)
  const chartW = screenWidth - 60;
  const chartH = 120;
  const padX = 6;
  const padY = 8;
  const drawW = chartW - 2 * padX;
  const drawH = chartH - 2 * padY;

  function xFor(i: number) {
    return padX + (i / Math.max(1, log.length - 1)) * drawW;
  }

  function yFor(v: number) {
    return padY + (1 - v / yMax) * drawH;
  }

  function points(s: typeof SERIES[number]) {
    return log.map((snap, i) => `${xFor(i)},${yFor(s.getValue(snap))}`).join(' ');
  }

  function toggleSeries(key: SeriesKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const visibleSeries = SERIES.filter((s) => !hidden.has(s.key));
  const midIdx = Math.floor(log.length / 2);
  // Grid lines at 25%, 50%, 75% of yMax
  const gridLines = [Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75)];

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      ...pixelShadow,
    }}>
      {/* Collapsible header */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
        }}
      >
        <PixelText size={8} upper>Development</PixelText>
        <PixelText size={8} color={WK.tealLight}>{expanded ? '▼' : '▶'}</PixelText>
      </Pressable>

      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>

          {/* SVG line chart */}
          <Svg width={chartW} height={chartH} style={{ marginBottom: 6 }}>
            {/* Chart background */}
            <Rect x={0} y={0} width={chartW} height={chartH} fill="rgba(0,0,0,0.35)" />

            {/* Horizontal grid lines at 25% / 50% / 75% of yMax */}
            {gridLines.map((v) => (
              <Line
                key={v}
                x1={padX} y1={yFor(v)}
                x2={chartW - padX} y2={yFor(v)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            ))}

            {/* Series polylines */}
            {visibleSeries.map((s) => (
              <Polyline
                key={s.key}
                points={points(s)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}

            {/* Terminal dot on the latest snapshot */}
            {visibleSeries.map((s) => (
              <Circle
                key={s.key}
                cx={xFor(log.length - 1)}
                cy={yFor(s.getValue(log[log.length - 1]))}
                r={2.5}
                fill={s.color}
              />
            ))}
          </Svg>

          {/* X-axis week labels */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: padX,
            marginBottom: 10,
          }}>
            <PixelText size={5} dim>WK{log[0].weekNumber}</PixelText>
            {log.length > 4 && (
              <PixelText size={5} dim>WK{log[midIdx].weekNumber}</PixelText>
            )}
            <PixelText size={5} dim>WK{log[log.length - 1].weekNumber}</PixelText>
          </View>

          {/* Toggleable legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SERIES.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => toggleSeries(s.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: hidden.has(s.key) ? 0.35 : 1,
                }}
              >
                <View style={{ width: 12, height: 4, backgroundColor: s.color }} />
                <PixelText size={5} dim>{s.label}</PixelText>
              </Pressable>
            ))}
          </View>

        </View>
      )}
    </View>
  );
}
