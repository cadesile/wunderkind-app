import type { ViewStyle } from 'react-native';

export type BaseShape = 'classic' | 'compact' | 'badge' | 'shield' | 'modern';

export interface PixelFootballBadgeProps {
  baseShape: BaseShape;
  primaryColor: string;
  secondaryColor: string;
  size?: number;
  style?: ViewStyle;
}
