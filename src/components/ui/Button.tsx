import { Pressable, PressableProps, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { PixelText } from './PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticPress } from '@/utils/haptics';

interface Props extends PressableProps {
  label: string;
  variant?: 'yellow' | 'green' | 'orange' | 'red' | 'blue' | 'teal';
  fullWidth?: boolean;
}

const VARIANTS: Record<NonNullable<Props['variant']>, { bg: string; text: string }> = {
  yellow: { bg: WK.yellow,    text: '#3a2000' },
  green:  { bg: WK.green,     text: '#fff' },
  orange: { bg: WK.orange,    text: '#fff' },
  red:    { bg: WK.red,       text: '#fff' },
  blue:   { bg: WK.blue,      text: '#fff' },
  teal:   { bg: WK.tealPanel, text: WK.text },
};

/** Pixel-art button — chunky border, elevation drop shadow */
export function Button({ label, variant = 'teal', fullWidth = false, disabled, style, onPress, ...rest }: Props) {
  const { bg, text } = VARIANTS[variant];

  function handlePress(e: GestureResponderEvent) {
    hapticPress();
    onPress?.(e);
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : handlePress}
      style={({ pressed }) => ({
        backgroundColor: disabled ? WK.tealCard : bg,
        borderWidth: 3,
        borderColor: WK.border,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center' as const,
        borderRadius: 0,
        opacity: disabled ? 0.5 : 1,
        transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }],
        ...(pressed
          ? { elevation: 1, shadowOffset: { width: 1, height: 1 } }
          : pixelShadow),
        ...(fullWidth ? { alignSelf: 'stretch' as const } : {}),
        ...(style ? (StyleSheet.flatten(style) as ViewStyle) : {}),
      })}
      {...rest}
    >
      <PixelText size={9} color={disabled ? WK.dim : text} upper>
        {label}
      </PixelText>
    </Pressable>
  );
}
