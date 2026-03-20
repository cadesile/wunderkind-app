import { Text, TextProps } from 'react-native';
import { WK } from '@/constants/theme';

export interface PixelTextProps extends TextProps {
  size?: number;
  color?: string;
  dim?: boolean;
  upper?: boolean;
  variant?: 'display' | 'body';
}

/**
 * All text in the app runs through PixelText so the Press Start 2P
 * font is applied consistently. Falls back gracefully before the font loads.
 *
 * variant='display' (default) — PressStart2P pixel font
 * variant='body'              — system sans-serif, more readable at small sizes
 */
export function PixelText({
  size = 10,
  color,
  dim = false,
  upper = false,
  variant = 'display',
  style,
  children,
  ...rest
}: PixelTextProps) {
  const isBody = variant === 'body';
  return (
    <Text
      style={[
        {
          ...(isBody ? {} : { fontFamily: WK.font }),
          fontSize: size,
          color: color ?? (dim ? WK.dim : WK.text),
          lineHeight: size * (isBody ? 1.3 : 1.5),
          letterSpacing: isBody ? 0 : 0.5,
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

/**
 * Convenience wrapper — system sans-serif body text.
 * Accepts all PixelText props except variant (always 'body').
 */
export function BodyText(props: Omit<PixelTextProps, 'variant'>) {
  return <PixelText {...props} variant="body" />;
}
