import { Stack } from 'expo-router';
import { WK } from '@/constants/theme';

export default function OfficeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: WK.greenDark },
      }}
    />
  );
}
