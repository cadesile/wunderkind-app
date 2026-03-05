import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

export default function MarketScoutsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper>Scout Market</PixelText>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <PixelText size={10} color={WK.yellow}>COMING SOON</PixelText>
        <PixelText size={7} dim>SCOUT MARKET LAUNCHING NEXT PATCH</PixelText>
      </View>
    </SafeAreaView>
  );
}
