/**
 * Placeholder screen for the Advance tab.
 * Navigation to this screen is intercepted by the custom tabBarButton
 * in app/(tabs)/_layout.tsx, which opens AdvanceModal instead.
 */
import { View } from 'react-native';
import { WK } from '@/constants/theme';

export default function AdvanceScreen() {
  return <View style={{ flex: 1, backgroundColor: WK.greenDark }} />;
}
