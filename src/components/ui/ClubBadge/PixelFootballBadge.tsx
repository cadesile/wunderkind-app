import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Defs, ClipPath, G } from 'react-native-svg';
import { WK, pixelShadow } from '@/constants/theme';
import type { BaseShape, PixelFootballBadgeProps } from './types';

// ─── Shape paths on 48×48 pixel grid ──────────────────────────────────────────

/**
 * Classic: tall heraldic pointed shield.
 * Straight sides stepping inward as it converges to a 4px tip at y=44.
 */
const CLASSIC_PATH =
  'M4,4 H44 V16 H42 V22 H40 V28 H36 V34 H30 V40 H26 V44 H22 V40 H18 V34 H12 V28 H8 V22 H6 V16 H4 Z';

/**
 * Compact: slightly wider-shouldered shield.
 * Sides bow outward before curving in to a pointed tip at y=44.
 */
const COMPACT_PATH =
  'M2,6 H46 V16 H44 V24 H40 V32 H34 V38 H28 V44 H24 V44 H20 V38 H14 V32 H8 V24 H4 V16 H2 Z';

/**
 * Badge: wide ceremonial/police badge.
 * Two small tab notches at the top, broad body, rounded bottom.
 */
const BADGE_PATH =
  'M4,10 H12 V4 H18 V10 H30 V4 H36 V10 H44 V34 H40 V38 H36 V42 H30 V44 H18 V42 H12 V38 H8 V34 H4 Z';

/**
 * Shield: rounded-bottom heraldic shield.
 * Wide flat top, sides taper to a wide rounded tip at y=44.
 */
const SHIELD_PATH =
  'M4,4 H44 V26 H42 V32 H38 V38 H32 V42 H28 V44 H24 V44 H20 V42 H16 V38 H10 V32 H6 V26 H4 Z';

/**
 * Modern: contemporary football club badge.
 * Raised crown at top, wide curved sides, rounded bottom.
 */
const MODERN_PATH =
  'M8,2 H40 V4 H46 V28 H44 V34 H40 V40 H34 V44 H28 V46 H20 V44 H14 V40 H8 V34 H4 V28 H2 V4 H8 Z';

const SHAPE_PATHS: Record<BaseShape, string> = {
  classic: CLASSIC_PATH,
  compact: COMPACT_PATH,
  badge:   BADGE_PATH,
  shield:  SHIELD_PATH,
  modern:  MODERN_PATH,
};

// Y coordinate dividing secondary (top) from primary (bottom) in 48px space
const STRIPE_DIVIDER_Y: Record<BaseShape, number> = {
  classic: 18,
  compact: 20,
  badge:   22,
  shield:  20,
  modern:  22,
};

// ─── Deterministic NPC shape assignment ───────────────────────────────────────

const SHAPES: BaseShape[] = ['classic', 'compact', 'badge', 'shield', 'modern'];

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

  // Fallback for any old persisted values ('circle', 'crest') no longer in the shape set
  const resolvedShape: BaseShape = SHAPE_PATHS[baseShape] ? baseShape : 'shield';
  const shapePath = SHAPE_PATHS[resolvedShape];
  const dividerY  = STRIPE_DIVIDER_Y[resolvedShape];

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
