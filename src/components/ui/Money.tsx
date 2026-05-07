import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { PixelText } from './PixelText';
import { renderMoney, MoneyStyle } from '@/utils/currency';
import { WK } from '@/constants/theme';

interface MoneyProps {
  /** Value in pence (100 = £1.00) */
  pence: number;
  /** Formatting style: 'whole' (default), 'compact', or 'decimal' */
  style?: MoneyStyle;
  /** Currency symbol (default: £) */
  symbol?: string;
  /** If true, always show + or - sign */
  sign?: boolean;
  /** Font size for PixelText */
  size?: number;
  /** If true, automatically color text green for positive and red for negative */
  autoColor?: boolean;
  /** Manual color override (disables autoColor) */
  color?: string;
  /** Custom style for the text */
  textStyle?: StyleProp<TextStyle>;
  /** Use specific variant of PixelText */
  variant?: 'display' | 'body' | 'vt323';
  /** If true, dim the text */
  dim?: boolean;
}

/**
 * The standard UI component for rendering all financial values.
 * Uses renderMoney() under the hood and ensures consistent pixel-art styling.
 */
export const Money: React.FC<MoneyProps> = ({
  pence,
  style = 'whole',
  symbol = '£',
  sign = false,
  size = 8,
  autoColor = false,
  color,
  textStyle,
  variant = 'body',
  dim = false,
}) => {
  const formatted = renderMoney(pence, { style, symbol, sign });

  let finalColor = color;
  if (!color && autoColor) {
    if (pence > 0) finalColor = WK.green;
    else if (pence < 0) finalColor = WK.red;
    else finalColor = WK.text;
  }

  return (
    <PixelText
      size={size}
      color={finalColor}
      style={textStyle}
      variant={variant}
      dim={dim}
    >
      {formatted}
    </PixelText>
  );
};
