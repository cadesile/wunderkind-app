import { Modal, View } from 'react-native';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  clubName: string;
  onDismiss: () => void;
}

export function WelcomeSplash({ clubName, onDismiss }: Props) {
  return (
    <Modal visible transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          paddingHorizontal: 24,
          paddingVertical: 28,
          marginHorizontal: 20,
          ...pixelShadow,
        }}>
          <PixelText size={10} upper style={{ textAlign: 'center' }}>
            WELCOME TO WUNDERKIND FACTORY.
          </PixelText>

          <View style={{
            height: 3,
            width: 60,
            backgroundColor: WK.yellow,
            alignSelf: 'center',
            marginVertical: 16,
          }} />

          <PixelText size={7} color={WK.yellow} style={{ textAlign: 'center' }}>
            {clubName.toUpperCase()} IS YOURS NOW.
          </PixelText>

          <PixelText size={6} dim style={{ textAlign: 'center', marginTop: 14, lineHeight: 16 }}>
            SCOUT THE RIGHT PROSPECTS, BACK YOUR COACHES, AND INVEST WISELY — AND YOU MIGHT JUST BUILD SOMETHING THE FOOTBALL WORLD WON'T FORGET.
          </PixelText>

          <View style={{
            height: 2,
            width: 40,
            backgroundColor: WK.dim,
            alignSelf: 'center',
            marginVertical: 14,
          }} />

          <PixelText size={6} color={WK.red} style={{ textAlign: 'center', lineHeight: 16 }}>
            OR DRAIN THE BUDGET, IGNORE YOUR PLAYERS, AND WATCH IT ALL COLLAPSE. THE GAME DOESN'T CARE EITHER WAY.
          </PixelText>

          <View style={{ marginTop: 20 }}>
            <Button label="▶ LET'S GET STARTED" variant="yellow" fullWidth onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
