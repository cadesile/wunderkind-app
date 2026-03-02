import { Text, TextProps } from 'react-native';
import { WK } from '@/constants/theme';

interface Props extends TextProps {
  size?: number;
  color?: string;
  dim?: boolean;
  upper?: boolean;
}

/**
 * All text in the app runs through PixelText so the Press Start 2P
 * font is applied consistently. Falls back gracefully before the font loads.
 */
export function PixelText({
  size = 10,
  color,
  dim = false,
  upper = false,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Text
      style={[
        {
          fontFamily: WK.font,
          fontSize: size,
          color: color ?? (dim ? WK.dim : WK.text),
          lineHeight: size * 1.8,
        },
        style,
      ]}
      {...rest}
    >
      {upper && typeof children === 'string'
        ? children.toUpperCase()
        : children}
    </Text>
  );
}
