import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLossConditionStore, LossConditionType } from '@/stores/lossConditionStore';
import { useAcademyStore } from '@/stores/academyStore';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

const FLAVOUR: Record<LossConditionType, { title: string; body: string }> = {
  insolvency: {
    title: 'ACADEMY FOLDED',
    body: "The academy's debts couldn't be repaid. The gates are locked. Another dream, over.",
  },
  talent_drain: {
    title: 'ACADEMY CLOSED',
    body: 'With no players left to develop, the academy fell silent. The pitch is empty.',
  },
};

export default function GameOverScreen() {
  const lossCondition = useLossConditionStore((s) => s.lossCondition);
  const requestNewGame = useLossConditionStore((s) => s.requestNewGame);
  const academy = useAcademyStore((s) => s.academy);

  const weeksSurvived = academy.weekNumber ?? 1;
  const totalEarnings = academy.totalCareerEarnings ?? 0;
  const hofPoints = academy.hallOfFamePoints ?? 0;

  const flavour = lossCondition ? FLAVOUR[lossCondition] : FLAVOUR.insolvency;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.tealDark }} edges={['top', 'bottom']}>
      {/* Prevent back gesture — game over is a hard stop */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <PitchBackground />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          gap: 24,
        }}
      >
        {/* Title */}
        <View style={{ alignItems: 'center', gap: 16 }}>
          <PixelText size={18} color={WK.red} upper style={{ textAlign: 'center' }}>
            {flavour.title}
          </PixelText>
          <PixelText
            size={7}
            color={WK.dim}
            style={{ textAlign: 'center', lineHeight: 16, maxWidth: 300 }}
          >
            {flavour.body}
          </PixelText>
        </View>

        {/* Stats card */}
        <View
          style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 20,
            width: '100%',
            maxWidth: 340,
            gap: 14,
            ...pixelShadow,
          }}
        >
          <PixelText size={8} upper style={{ marginBottom: 4 }}>
            Final Record
          </PixelText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PixelText size={7} color={WK.dim}>Weeks Survived</PixelText>
            <PixelText size={9} color={WK.yellow}>{weeksSurvived}</PixelText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PixelText size={7} color={WK.dim}>Career Earnings</PixelText>
            <PixelText size={9} color={WK.yellow}>
              £{totalEarnings.toLocaleString()}
            </PixelText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PixelText size={7} color={WK.dim}>HoF Points</PixelText>
            <PixelText size={9} color={WK.yellow}>{hofPoints}</PixelText>
          </View>
        </View>

        {/* Start again */}
        <View style={{ width: '100%', maxWidth: 340 }}>
          <Button
            label="START AGAIN"
            variant="yellow"
            fullWidth
            onPress={requestNewGame}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
