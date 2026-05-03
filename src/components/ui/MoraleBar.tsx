import { View } from 'react-native';
import { WK } from '@/constants/theme';

export function moraleBarColor(morale: number): string {
  if (morale >= 60) return '#4CAF50';
  if (morale >= 40) return WK.yellow;
  return WK.red;
}

interface MoraleBarProps {
  morale: number;
  /** Fixed pixel width, or '100%' to fill parent. Defaults to 48. */
  width?: number | string;
  height?: number;
  borderWidth?: number;
}

export function MoraleBar({ morale, width = 48, height = 6, borderWidth = 1 }: MoraleBarProps) {
  const clamped = Math.min(100, Math.max(0, morale));
  const color = moraleBarColor(clamped);
  return (
    <View style={{
      width: width as any,
      height,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth,
      borderColor: WK.border,
    }}>
      <View style={{ height: '100%', width: `${clamped}%`, backgroundColor: color }} />
    </View>
  );
}
