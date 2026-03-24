import { SafeAreaView } from 'react-native-safe-area-context';
import { AcademyDashboard } from '@/components/AcademyDashboard';
import { WK } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <AcademyDashboard />
    </SafeAreaView>
  );
}
