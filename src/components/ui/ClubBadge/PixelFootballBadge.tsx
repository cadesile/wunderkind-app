import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Defs, ClipPath, G } from 'react-native-svg';
import { WK, pixelShadow } from '@/constants/theme';
import type { BaseShape, PixelFootballBadgeProps } from './types';

// ─── Shape paths on 48×48 pixel grid ──────────────────────────────────────────

/**
 * Shield: classic heraldic pointed-bottom shape.
 * 40px wide at top, converging to 4px tip at y=44.
 */
const SHIELD_PATH =
  'M4,4 H44 V30 H40 V34 H36 V38 H28 V42 H26 V44 H22 V42 H20 V38 H12 V34 H8 V30 H4 Z';

/**
 * Circle: pixel-art octagon approximating a circle.
 * Stepped corners on a 44×44 body.
 */
const CIRCLE_PATH =
  'M12,4 H36 V8 H40 V12 H44 V36 H40 V40 H36 V44 H12 V40 H8 V36 H4 V12 H8 V8 H12 Z';

/**
 * Crest: wider European shield — flared sides in the upper body,
 * converging to a 4px tip at y=44.
 */
const CREST_PATH =
  'M6,2 H42 V6 H46 V28 H42 V32 H38 V36 H32 V40 H26 V44 H22 V40 H16 V36 H10 V32 H6 V28 H2 V6 H6 Z';

const SHAPE_PATHS: Record<BaseShape, string> = {
  shield: SHIELD_PATH,
  circle: CIRCLE_PATH,
  crest: CREST_PATH,
};

// Y coordinate dividing secondary (top) from primary (bottom) in 48px space
const STRIPE_DIVIDER_Y: Record<BaseShape, number> = {
  shield: 20,
  circle: 22,
  crest: 20,
};

// ─── Deterministic NPC shape assignment ───────────────────────────────────────

const SHAPES: BaseShape[] = ['shield', 'circle', 'crest'];

/**
 * Assigns a deterministic badge shape to an NPC club based on its id.
 * Stable: same id always returns the same shape.
 */
export function getNpcBadgeShape(clubId: string): BaseShape {
  const hash = clubId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SHAPES[hash % SHAPES.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PixelFootballBadge({
  baseShape,
  primaryColor,
  secondaryColor,
  size = 48,
  style,
}: PixelFootballBadgeProps) {
  // Unique clip-path ID per instance — avoids collisions when multiple badges render
  const clipId = useMemo(
    () => `badge-clip-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const shapePath = SHAPE_PATHS[baseShape];
  const dividerY  = STRIPE_DIVIDER_Y[baseShape];

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={shapePath} />
          </ClipPath>
        </Defs>

        {/* Base fill — primary color */}
        <Path fill={primaryColor} d={shapePath} />

        {/* Secondary colour top stripe (clipped to shape) */}
        <G clipPath={`url(#${clipId})`}>
          <Rect fill={secondaryColor} x={0} y={0} width={48} height={dividerY} />
        </G>

        {/* Divider border line between the two colour bands */}
        <G clipPath={`url(#${clipId})`}>
          <Rect fill={WK.border} x={0} y={dividerY} width={48} height={2} />
        </G>

        {/* Outer border / silhouette */}
        <Path
          fill="none"
          stroke={WK.border}
          strokeWidth={3}
          d={shapePath}
        />

        {/* Left-edge highlight strip */}
        <G clipPath={`url(#${clipId})`}>
          <Rect
            fill="rgba(255,255,255,0.12)"
            x={0}
            y={0}
            width={5}
            height={48}
          />
        </G>

        {/* Top-edge highlight strip */}
        <G clipPath={`url(#${clipId})`}>
          <Rect
            fill="rgba(255,255,255,0.08)"
            x={0}
            y={0}
            width={48}
            height={3}
          />
        </G>
      </Svg>
    </View>
  );
}
