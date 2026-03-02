import { View, ViewProps } from 'react-native';
import { WK, pixelShadow } from '@/constants/theme';

interface Props extends ViewProps {
  variant?: 'panel' | 'card';
}

/** Pixel-art card — teal-card background with chunky border and drop shadow */
export function Card({ children, variant = 'card', style, ...rest }: Props) {
  const bg = variant === 'panel' ? WK.tealDark : WK.tealCard;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          borderRadius: 0,
          ...pixelShadow,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
