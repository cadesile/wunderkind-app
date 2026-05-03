import { View } from 'react-native';
import Svg, { Rect, Line, Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StadiumFacility {
  slug:     string;
  level:    number;
  maxLevel: number;
}

export interface StadiumViewProps {
  facilities:    StadiumFacility[];
  stadiumName:   string;
  primaryColour: string;
  size?:         number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PITCH_FILL   = '#2d7a3a';
const PITCH_MARK   = '#3db89a';
const RUBBLE_A     = '#1a2828';
const RUBBLE_B     = '#0d1e1e';
const EMPTY_CORNER = '#2a3a3a';
const OUTER_GROUND = '#111e1e';
const BORDER_W     = 3;
const MARK_W       = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns how far a stand extends from the corner edge toward the pitch.
 * Level 0 (rubble) uses the same footprint as level 1.
 */
export function getStandDepth(
  level:          number,
  maxLevel:       number,
  availableSpace: number,
): number {
  const effective = level === 0 ? 1 : level;
  if (effective <= maxLevel / 2) return Math.round(availableSpace * 0.28);
  return Math.round(availableSpace * 0.45);
}

function getFacilityLevel(
  facilities: StadiumFacility[],
  slug:       string,
): { level: number; maxLevel: number } {
  const f = facilities.find((fac) => fac.slug === slug);
  return { level: f?.level ?? 0, maxLevel: f?.maxLevel ?? 5 };
}

// ─── Rubble fill ──────────────────────────────────────────────────────────────

function RubbleFill({ x, y, width, height }: {
  x: number; y: number; width: number; height: number;
}) {
  const cell = 8;
  const rects: JSX.Element[] = [];
  const cols = Math.ceil(width  / cell);
  const rows = Math.ceil(height / cell);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rx = x + c * cell;
      const ry = y + r * cell;
      const rw = Math.min(cell, x + width  - rx);
      const rh = Math.min(cell, y + height - ry);
      if (rw <= 0 || rh <= 0) continue;
      rects.push(
        <Rect key={`r${r}c${c}`}
          x={rx} y={ry} width={rw} height={rh}
          fill={(r + c) % 2 === 0 ? RUBBLE_A : RUBBLE_B}
        />,
      );
    }
  }
  return <G>{rects}</G>;
}

// ─── Empty corner (horizontal dirt marks) ─────────────────────────────────────

function EmptyCorner({ x, y, size }: { x: number; y: number; size: number }) {
  const pad  = Math.round(size * 0.1);
  const markH = Math.max(3, Math.round(size * 0.07));
  // Proportional widths and y offsets for debris marks
  const marks = [
    { dy: 0.13, w: 0.33 },
    { dy: 0.26, w: 0.56 },
    { dy: 0.38, w: 0.44 },
    { dy: 0.51, w: 0.28 },
    { dy: 0.63, w: 0.50 },
    { dy: 0.75, w: 0.39 },
  ];
  return (
    <G>
      <Rect x={x} y={y} width={size} height={size}
        fill={EMPTY_CORNER} stroke={WK.border} strokeWidth={BORDER_W} />
      {marks.map((m, i) => (
        <Rect key={i}
          x={x + pad}
          y={y + Math.round(size * m.dy)}
          width={Math.round(size * m.w)}
          height={markH}
          fill={RUBBLE_A}
        />
      ))}
    </G>
  );
}

// ─── Museum corner (NE) ───────────────────────────────────────────────────────

function MuseumCorner({ x, y, size }: { x: number; y: number; size: number }) {
  const pad    = Math.round(size * 0.14);
  const bx     = x + pad;
  const by     = y + pad;
  const bw     = size - 2 * pad;
  const bh     = size - 2 * pad;
  const roofH  = Math.max(4, Math.round(bh * 0.12));
  const numCol = 5;
  const colW   = Math.max(2, Math.round(bw * 0.065));
  const colGap = (bw - numCol * colW) / (numCol + 1);
  const doorW  = Math.round(bw * 0.22);
  const doorH  = Math.round(bh * 0.44);
  const doorX  = bx + Math.round((bw - doorW) / 2);
  const doorY  = by + bh - doorH;
  const colBodyTop = by + roofH + 2;
  const colBodyH   = bh - roofH - doorH - 2;

  return (
    <G>
      {/* Dark corner base */}
      <Rect x={x} y={y} width={size} height={size}
        fill={WK.border} stroke={WK.border} strokeWidth={2} />
      {/* Building footprint */}
      <Rect x={bx} y={by} width={bw} height={bh}
        fill={WK.tealCard} stroke={WK.border} strokeWidth={2} />
      {/* Column strips */}
      {Array.from({ length: numCol }).map((_, i) => (
        <Rect key={i}
          x={bx + Math.round(colGap * (i + 1) + colW * i)}
          y={colBodyTop}
          width={colW}
          height={Math.max(2, colBodyH)}
          fill={WK.tealPanel}
        />
      ))}
      {/* Door opening */}
      <Rect x={doorX} y={doorY} width={doorW} height={doorH} fill={WK.border} />
      {/* Roof strip — teal */}
      <Rect x={bx} y={by} width={bw} height={roofH}
        fill={WK.tealLight} stroke={WK.border} strokeWidth={1} />
    </G>
  );
}

// ─── Club Shop corner (SW) ────────────────────────────────────────────────────

function ShopCorner({ x, y, size }: { x: number; y: number; size: number }) {
  const pad   = Math.round(size * 0.14);
  const bx    = x + pad;
  const by    = y + pad;
  const bw    = size - 2 * pad;
  const bh    = size - 2 * pad;
  const roofH = Math.max(4, Math.round(bh * 0.12));
  const winW  = Math.round(bw * 0.35);
  const winH  = Math.round(bh * 0.30);
  const winY  = by + roofH + Math.round(bh * 0.12);
  const win1X = bx + Math.round(bw * 0.05);
  const win2X = bx + bw - Math.round(bw * 0.05) - winW;
  const lineW = winW - 4;
  const doorW = Math.round(bw * 0.28);
  const doorH = Math.round(bh * 0.40);
  const doorX = bx + Math.round((bw - doorW) / 2);
  const doorY = by + bh - doorH;

  return (
    <G>
      {/* Dark corner base */}
      <Rect x={x} y={y} width={size} height={size}
        fill={WK.border} stroke={WK.border} strokeWidth={2} />
      {/* Building footprint */}
      <Rect x={bx} y={by} width={bw} height={bh}
        fill={WK.tealCard} stroke={WK.border} strokeWidth={2} />
      {/* Left window */}
      <Rect x={win1X} y={winY} width={winW} height={winH}
        fill={WK.tealLight} stroke={WK.border} strokeWidth={1} />
      {/* Right window */}
      <Rect x={win2X} y={winY} width={winW} height={winH}
        fill={WK.tealLight} stroke={WK.border} strokeWidth={1} />
      {/* Window cross-bars */}
      <Rect x={win1X + 2} y={winY + Math.round(winH * 0.35)} width={lineW} height={2} fill={WK.border} />
      <Rect x={win1X + 2} y={winY + Math.round(winH * 0.65)} width={lineW} height={2} fill={WK.border} />
      {/* Door */}
      <Rect x={doorX} y={doorY} width={doorW} height={doorH} fill={WK.border} />
      {/* Roof strip — orange */}
      <Rect x={bx} y={by} width={bw} height={roofH}
        fill={WK.orange} stroke={WK.border} strokeWidth={1} />
    </G>
  );
}

// ─── Stand ────────────────────────────────────────────────────────────────────

function Stand({
  x, y, width, height, level, primaryColour, orientation,
}: {
  x: number; y: number; width: number; height: number;
  level: number; primaryColour: string;
  orientation: 'horizontal' | 'vertical';
}) {
  if (level === 0) {
    return (
      <G>
        <Rect x={x} y={y} width={width} height={height}
          fill={RUBBLE_A} stroke={WK.border} strokeWidth={BORDER_W} />
        <RubbleFill x={x + 2} y={y + 2} width={width - 4} height={height - 4} />
      </G>
    );
  }

  const rowSize = 4;
  const rowGap  = 10;
  const inset   = 10;
  const rows: JSX.Element[] = [];

  if (orientation === 'horizontal') {
    // Horizontal seating rows (north/south stands)
    let ry = y + inset;
    let i  = 0;
    while (ry + rowSize <= y + height - inset) {
      rows.push(
        <Rect key={i++}
          x={x + inset} y={ry}
          width={width - 2 * inset} height={rowSize}
          fill="rgba(0,0,0,0.25)"
        />,
      );
      ry += rowGap;
    }
  } else {
    // Vertical seating columns (east/west stands)
    let rx = x + inset;
    let i  = 0;
    while (rx + rowSize <= x + width - inset) {
      rows.push(
        <Rect key={i++}
          x={rx} y={y + inset}
          width={rowSize} height={height - 2 * inset}
          fill="rgba(0,0,0,0.25)"
        />,
      );
      rx += rowGap;
    }
  }

  return (
    <G>
      <Rect x={x} y={y} width={width} height={height}
        fill={primaryColour} stroke={WK.border} strokeWidth={BORDER_W} />
      {rows}
    </G>
  );
}

// ─── Pitch ────────────────────────────────────────────────────────────────────

function Pitch({ x, y, width: w, height: h }: {
  x: number; y: number; width: number; height: number;
}) {
  // Inner margin: gap between outer border and field markings
  const off = Math.max(6, Math.round(Math.min(w, h) * 0.08));

  const ix  = x + off;
  const iy  = y + off;
  const iw  = w - 2 * off;
  const ih  = h - 2 * off;
  const icx = ix + iw / 2;
  const icy = iy + ih / 2;

  const circR = Math.round(Math.min(iw, ih) * 0.14);
  const arcR  = Math.min(10, Math.round(Math.min(iw, ih) * 0.07));

  // Penalty box: 50% of inner width, 16% of inner height
  const penW = Math.round(iw * 0.50);
  const penH = Math.round(ih * 0.16);
  const penX = Math.round(icx - penW / 2);

  // Goal box: 28% wide, 8% tall
  const goalW = Math.round(iw * 0.28);
  const goalH = Math.round(ih * 0.08);
  const goalX = Math.round(icx - goalW / 2);

  // Goal net: sits in the outer margin gap at top/bottom, centred
  const netW   = Math.round(iw * 0.28);
  const netX   = Math.round(icx - netW / 2);
  const netOff = Math.round(off * 0.5);   // start halfway into the margin
  const netH   = off - netOff - 1;        // fills remaining margin to inner line

  // Penalty spots
  const spotInset = Math.round(ih * 0.15);

  return (
    <G>
      {/* Base green */}
      <Rect x={x} y={y} width={w} height={h} fill={PITCH_FILL} />

      {/* Outer border */}
      <Rect x={x} y={y} width={w} height={h}
        fill="none" stroke={WK.border} strokeWidth={BORDER_W} />

      {/* Goal nets — within top/bottom margin gap */}
      <Rect x={netX} y={y + netOff} width={netW} height={netH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />
      <Rect x={netX} y={y + h - off + 1} width={netW} height={netH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Inner margin line */}
      <Rect x={ix} y={iy} width={iw} height={ih}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Halfway line */}
      <Line x1={ix} y1={icy} x2={ix + iw} y2={icy}
        stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Centre circle */}
      <Circle cx={icx} cy={icy} r={circR}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Centre spot */}
      <Circle cx={icx} cy={icy} r={2} fill={PITCH_MARK} />

      {/* Penalty boxes */}
      <Rect x={penX} y={iy} width={penW} height={penH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />
      <Rect x={penX} y={iy + ih - penH} width={penW} height={penH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Goal boxes */}
      <Rect x={goalX} y={iy} width={goalW} height={goalH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />
      <Rect x={goalX} y={iy + ih - goalH} width={goalW} height={goalH}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W} />

      {/* Penalty spots */}
      <Circle cx={icx} cy={iy + spotInset} r={3} fill={PITCH_MARK} />
      <Circle cx={icx} cy={iy + ih - spotInset} r={3} fill={PITCH_MARK} />

      {/* Corner arcs — Q bezier from each inner corner, curving into pitch */}
      <Path
        d={`M ${ix} ${iy} Q ${ix + arcR} ${iy} ${ix + arcR} ${iy + arcR}`}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W - 0.5}
      />
      <Path
        d={`M ${ix + iw} ${iy} Q ${ix + iw - arcR} ${iy} ${ix + iw - arcR} ${iy + arcR}`}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W - 0.5}
      />
      <Path
        d={`M ${ix + iw} ${iy + ih} Q ${ix + iw - arcR} ${iy + ih} ${ix + iw - arcR} ${iy + ih - arcR}`}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W - 0.5}
      />
      <Path
        d={`M ${ix} ${iy + ih} Q ${ix + arcR} ${iy + ih} ${ix + arcR} ${iy + ih - arcR}`}
        fill="none" stroke={PITCH_MARK} strokeWidth={MARK_W - 0.5}
      />
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StadiumView({
  facilities,
  stadiumName,
  primaryColour,
  size = 320,
}: StadiumViewProps) {
  const S       = size;
  const primary = (primaryColour?.trim() || WK.orange);
  const C       = Math.round(S * 0.15);

  const availSpace = (S - 2 * C) / 2;

  const north = getFacilityLevel(facilities, 'north_stand');
  const south = getFacilityLevel(facilities, 'south_stand');
  const east  = getFacilityLevel(facilities, 'east_stand');
  const west  = getFacilityLevel(facilities, 'west_stand');

  const nD = getStandDepth(north.level, north.maxLevel, availSpace);
  const sD = getStandDepth(south.level, south.maxLevel, availSpace);
  const eD = getStandDepth(east.level,  east.maxLevel,  availSpace);
  const wD = getStandDepth(west.level,  west.maxLevel,  availSpace);

  const pitchX = C + wD;
  const pitchY = C + nD;
  const pitchW = S - 2 * C - wD - eD;
  const pitchH = S - 2 * C - nD - sD;

  return (
    <View>
      <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>

        {/* Outer ground */}
        <Rect x={0} y={0} width={S} height={S} fill={OUTER_GROUND} />

        {/* Pitch */}
        <Pitch x={pitchX} y={pitchY} width={pitchW} height={pitchH} />

        {/* North stand */}
        <Stand
          x={C} y={C}
          width={S - 2 * C} height={nD}
          level={north.level} primaryColour={primary}
          orientation="horizontal"
        />
        {north.level > 0 && (
          <Rect x={C} y={C + nD - 3} width={S - 2 * C} height={3}
            fill="rgba(255,255,255,0.15)" />
        )}

        {/* South stand */}
        <Stand
          x={C} y={S - C - sD}
          width={S - 2 * C} height={sD}
          level={south.level} primaryColour={primary}
          orientation="horizontal"
        />
        {south.level > 0 && (
          <Rect x={C} y={S - C - sD} width={S - 2 * C} height={3}
            fill="rgba(255,255,255,0.15)" />
        )}

        {/* West stand */}
        <Stand
          x={C} y={C + nD}
          width={wD} height={pitchH}
          level={west.level} primaryColour={primary}
          orientation="vertical"
        />
        {west.level > 0 && (
          <Rect x={C + wD - 3} y={C + nD} width={3} height={pitchH}
            fill="rgba(255,255,255,0.15)" />
        )}

        {/* East stand */}
        <Stand
          x={S - C - eD} y={C + nD}
          width={eD} height={pitchH}
          level={east.level} primaryColour={primary}
          orientation="vertical"
        />
        {east.level > 0 && (
          <Rect x={S - C - eD} y={C + nD} width={3} height={pitchH}
            fill="rgba(255,255,255,0.15)" />
        )}

        {/* NW corner — empty plot */}
        <EmptyCorner x={0} y={0} size={C} />

        {/* NE corner — Museum */}
        <MuseumCorner x={S - C} y={0} size={C} />

        {/* SW corner — Club Shop */}
        <ShopCorner x={0} y={S - C} size={C} />

        {/* SE corner — empty plot */}
        <EmptyCorner x={S - C} y={S - C} size={C} />

      </Svg>

      <PixelText size={8} upper style={{ textAlign: 'center', marginTop: 8 }}>
        {stadiumName}
      </PixelText>
    </View>
  );
}
