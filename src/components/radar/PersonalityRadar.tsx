import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { PersonalityMatrix, TraitName } from '@/types/player';
import { WK } from '@/constants/theme';

interface Props {
  personality: PersonalityMatrix;
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
const CX = 100;
const CY = 105; // slightly below centre to allow label space above
const R  = 62;  // outer ring radius
const LR = 80;  // label radius

function toAngle(i: number): number {
  return (i / N) * 2 * Math.PI - Math.PI / 2;
}

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
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
  if (sin > 0.5) return 10;   // below centre → nudge down
  if (sin < -0.5) return -4;  // above centre → nudge up
  return 4;
}

const RINGS = [1, 0.75, 0.5, 0.25];

export function PersonalityRadar({ personality }: Props) {
  const outerPts = TRAITS.map((_, i) => polar(R, toAngle(i)));
  const dataPts  = TRAITS.map(({ key }, i) =>
    polar(R * (personality[key] / 20), toAngle(i)),
  );

  return (
    <Svg width={200} height={210} viewBox="0 0 200 210">
      {/* Grid rings */}
      {RINGS.map((scale) => (
        <Polygon
          key={scale}
          points={pts(TRAITS.map((_, i) => polar(R * scale, toAngle(i))))}
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
        const [x, y] = polar(LR, angle);
        return (
          <SvgText
            key={label}
            x={x}
            y={y + labelDy(angle)}
            textAnchor={labelAnchor(angle)}
            fontFamily={WK.font}
            fontSize={6}
            fill={WK.dim}
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
