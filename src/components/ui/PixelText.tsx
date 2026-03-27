import { Text, TextProps } from 'react-native';
import { WK } from '@/constants/theme';

export interface PixelTextProps extends TextProps {
  size?: number;
  color?: string;
  dim?: boolean;
  upper?: boolean;
  /**
   * 'display' (default) — Press Start 2P pixel font. Use for titles, scores,
   *   key stats, and labels ≥10px.
   * 'body'              — System sans-serif. Use for names, descriptions,
   *   secondary info, and anything that must be legible at small sizes.
   * 'vt323'             — VT323 terminal font. Pixel-art aesthetic with far
   *   better legibility than Press Start 2P at 14–20px. Use for data rows,
   *   compact labels, and anywhere the pixel look matters but readability is key.
   */
  variant?: 'display' | 'body' | 'vt323';
}

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
  const isBody  = variant === 'body';
  const isVT323 = variant === 'vt323';

  function getFontFamily(): string | undefined {
    if (isVT323) return WK.fontVT323;
    if (isBody)  return undefined; // system font
    return WK.font;
  }

  function getLineHeight(): number {
    if (isBody)  return size * 1.45;
    if (isVT323) return size * 1.35;
    // Press Start 2P needs generous line-height — it's very wide at small sizes
    if (size < 10) return size * 2.2;
    return size * 1.8;
  }

  return (
    <Text
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: size,
          color: color ?? (dim ? WK.dim : WK.text),
          lineHeight: getLineHeight(),
          letterSpacing: isBody ? 0 : isVT323 ? 0.2 : 0.5,
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
 * System sans-serif body text.
 * Use for names, descriptions, and all secondary/supporting content.
 * Accepts all PixelText props except variant (always 'body').
 */
export function BodyText(props: Omit<PixelTextProps, 'variant'>) {
  return <PixelText {...props} variant="body" />;
}

/**
 * VT323 terminal font — pixel aesthetic at readable sizes.
 * Best at size 14–20. Use for data rows, compact labels, stat values.
 * Accepts all PixelText props except variant (always 'vt323').
 */
export function VT323Text(props: Omit<PixelTextProps, 'variant'>) {
  return <PixelText {...props} variant="vt323" />;
}
