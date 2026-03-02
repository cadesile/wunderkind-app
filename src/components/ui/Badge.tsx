import { View } from 'react-native';
import { PixelText } from './PixelText';
import { WK } from '@/constants/theme';

interface Props {
  label: string;
  color?: 'green' | 'yellow' | 'red' | 'dim';
}

const COLORS = {
  green:  { bg: WK.green,  text: '#fff' },
  yellow: { bg: WK.yellow, text: '#3a2000' },
  red:    { bg: WK.red,    text: '#fff' },
  dim:    { bg: WK.tealPanel, text: WK.text },
};

/** Pixel-art badge — square corners, thick border */
export function Badge({ label, color = 'dim' }: Props) {
  const { bg, text } = COLORS[color];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: WK.border,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 0,
      }}
    >
      <PixelText size={8} color={text} upper>
        {label}
      </PixelText>
    </View>
  );
}
