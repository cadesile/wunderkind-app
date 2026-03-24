import { View, Pressable, PressableProps, StyleSheet, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import { PixelText } from './PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticPress } from '@/utils/haptics';

interface Props extends PressableProps {
  label: string;
  variant?: 'yellow' | 'green' | 'orange' | 'red' | 'blue' | 'teal';
  fullWidth?: boolean;
}

const VARIANTS: Record<NonNullable<Props['variant']>, { bg: string; text: string }> = {
  yellow: { bg: WK.yellow,   text: WK.border },
  green:  { bg: WK.green,    text: WK.text },
  orange: { bg: WK.orange,   text: WK.text },
  red:    { bg: WK.red,      text: WK.text },
  blue:   { bg: WK.blue,     text: WK.text },
  teal:   { bg: WK.tealCard, text: WK.text },
};

const pressedShadow: ViewStyle = {
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 1, height: 1 },
  shadowOpacity: 0.45,
  shadowRadius: 0,
  transform: [{ translateX: 2 }, { translateY: 2 }],
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inner: {
    borderWidth: 3,
    borderColor: WK.border,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

/** Pixel-art button — visual styles live on inner View for reliable Android rendering */
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
      style={[fullWidth ? styles.fullWidth : styles.pressable, style as StyleProp<ViewStyle>]}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.inner,
            { backgroundColor: bg },
            pressed ? pressedShadow : pixelShadow,
            disabled ? styles.disabled : null,
          ]}
        >
          <PixelText size={9} color={text} upper>
            {label}
          </PixelText>
        </View>
      )}
    </Pressable>
  );
}
