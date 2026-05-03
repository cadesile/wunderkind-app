import type { ViewStyle } from 'react-native';

export type BaseShape = 'shield' | 'circle' | 'crest';

export interface PixelFootballBadgeProps {
  baseShape: BaseShape;
  primaryColor: string;
  secondaryColor: string;
  size?: number;
  style?: ViewStyle;
}
