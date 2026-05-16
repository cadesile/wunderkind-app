import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface MoraleArrowProps {
  morale: number;
  size?: number;
}

function moraleAngle(morale: number): number {
  const m = Math.max(0, Math.min(100, morale));
  if (m >= 87.5) return 0;
  if (m >= 62.5) return 45;
  if (m >= 37.5) return 90;
  if (m >= 12.5) return 135;
  return 180;
}

function moraleHsl(morale: number): string {
  const m = Math.max(0, Math.min(100, morale));
  const hue = Math.round((m / 100) * 120);
  return `hsl(${hue}, 100%, 45%)`;
}

export function MoraleArrow({ morale, size = 24 }: MoraleArrowProps) {
  const angle = moraleAngle(morale);
  const color = moraleHsl(morale);

  return (
    <View style={{ transform: [{ rotate: `${angle}deg` }], width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 3l7 7h-4v11h-6v-11h-4l7-7z"
          fill={color}
          stroke="#000000"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
