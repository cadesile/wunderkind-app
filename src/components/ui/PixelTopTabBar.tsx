import { View, Pressable } from 'react-native';
import { PixelText } from './PixelText';
import { WK } from '@/constants/theme';
import { hapticTap } from '@/utils/haptics';

interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

/**
 * Pixel-art top tab bar for hub screens.
 * Pure View + Pressable — no external library dependencies.
 */
export function PixelTopTabBar({ tabs, active, onChange }: Props) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: WK.tealDark,
      borderBottomWidth: 3,
      borderBottomColor: WK.border,
    }}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => { hapticTap(); onChange(tab); }}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: isActive ? 3 : 0,
              borderBottomColor: WK.yellow,
            }}
          >
            <PixelText
              size={7}
              color={isActive ? WK.yellow : WK.dim}
            >
              {tab}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}
