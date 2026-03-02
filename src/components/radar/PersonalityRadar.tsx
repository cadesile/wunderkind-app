import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { PersonalityMatrix, TraitName } from '@/types/player';
import { WK } from '@/constants/theme';

interface Props {
  personality: PersonalityMatrix;
  /** Rendered width/height of the SVG. Defaults to 200. */
  size?: number;
}

const TRAITS: { key: TraitName; label: string }[] = [
  { key: 'determination',   label: 'DET' },
  { key: 'professionalism', label: 'PRO' },
  { key: 'ambition',        label: 'AMB' },
  { key: 'loyalty',         label: 'LOY' },
  { key: 'pressure',        label: 'PRE' },
  { key: 'consistency',     label: 'CON' },
  { key: 'temperament',     label: 'TEM' },
  { key: 'adaptability',    label: 'ADA' },
];

const N = TRAITS.length;

function toAngle(i: number): number {
  return (i / N) * 2 * Math.PI - Math.PI / 2;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function pts(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function labelAnchor(angle: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angle);
  if (cos > 0.3) return 'start';
  if (cos < -0.3) return 'end';
  return 'middle';
}

function labelDy(angle: number): number {
  const sin = Math.sin(angle);
  if (sin > 0.5) return 10;
  if (sin < -0.5) return -4;
  return 4;
}

const RINGS = [1, 0.75, 0.5, 0.25];

export function PersonalityRadar({ personality, size = 200 }: Props) {
  // Derive geometry from the size prop so the chart scales dynamically
  const VW = size;
  const VH = size + 10; // a little extra height for bottom labels
  const CX = VW / 2;
  const CY = VH / 2 + 5;
  const R  = VW * 0.31;   // outer ring radius — 31% of width
  const LR = VW * 0.40;   // label radius

  const outerPts = TRAITS.map((_, i) => polar(CX, CY, R, toAngle(i)));
  const dataPts  = TRAITS.map(({ key }, i) =>
    polar(CX, CY, R * (personality[key] / 20), toAngle(i)),
  );

  return (
    <Svg width={size} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
      {/* Grid rings */}
      {RINGS.map((scale) => (
        <Polygon
          key={scale}
          points={pts(TRAITS.map((_, i) => polar(CX, CY, R * scale, toAngle(i))))}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {outerPts.map(([x, y], i) => (
        <Line
          key={i}
          x1={CX} y1={CY}
          x2={x}  y2={y}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Filled data area */}
      <Polygon
        points={pts(dataPts)}
        fill="rgba(61,184,154,0.3)"
        stroke={WK.tealLight}
        strokeWidth={2}
      />

      {/* Data point dots */}
      {dataPts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3} fill={WK.tealLight} />
      ))}

      {/* Axis labels */}
      {TRAITS.map(({ label }, i) => {
        const angle = toAngle(i);
        const [x, y] = polar(CX, CY, LR, angle);
        return (
          <SvgText
            key={label}
            x={x}
            y={y + labelDy(angle)}
            textAnchor={labelAnchor(angle)}
            fontFamily={WK.font}
            fontSize={7}
            fill={WK.dim}
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
