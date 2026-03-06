import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { PlayerAttributes, AttributeName } from '@/types/player';
import { WK } from '@/constants/theme';

interface Props {
  attributes: PlayerAttributes;
  /** Rendered width/height of the SVG. Defaults to 200. */
  size?: number;
}

const ATTRS: { key: AttributeName; label: string }[] = [
  { key: 'pace',      label: 'PACE' },
  { key: 'technical', label: 'TECH' },
  { key: 'vision',    label: 'VIS'  },
  { key: 'power',     label: 'PWR'  },
  { key: 'stamina',   label: 'STA'  },
  { key: 'heart',     label: 'HRT'  },
];

const N = ATTRS.length;

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

export function AttributesRadar({ attributes, size = 200 }: Props) {
  const VW = size;
  const VH = size + 10;
  const CX = VW / 2;
  const CY = VH / 2 + 5;
  const R  = VW * 0.31;
  const LR = VW * 0.41;

  const outerPts = ATTRS.map((_, i) => polar(CX, CY, R, toAngle(i)));
  // attributes are 0–100 scale
  const dataPts  = ATTRS.map(({ key }, i) =>
    polar(CX, CY, R * ((attributes[key] ?? 0) / 100), toAngle(i)),
  );

  return (
    <Svg width={size} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
      {/* Grid rings */}
      {RINGS.map((scale) => (
        <Polygon
          key={scale}
          points={pts(ATTRS.map((_, i) => polar(CX, CY, R * scale, toAngle(i))))}
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
        fill="rgba(245,200,66,0.2)"
        stroke={WK.yellow}
        strokeWidth={2}
      />

      {/* Data point dots */}
      {dataPts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3} fill={WK.yellow} />
      ))}

      {/* Axis labels */}
      {ATTRS.map(({ label }, i) => {
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
