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

          <PixelText size={8} color={WK.yellow} style={{ textAlign: 'center' }}>
            {clubName.toUpperCase()} IS YOURS NOW.
          </PixelText>

          <PixelText size={7} style={{ textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
            BUILD YOUR SQUAD, CLIMB THE LEAGUE, AND DEVELOP YOUR FACILITIES INTO SOMETHING THAT RIVALS FEAR.
          </PixelText>

          <PixelText size={7} style={{ textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
            EVERY SIGNING, EVERY MATCH, EVERY DECISION — IT ALL COUNTS.
          </PixelText>

          {/* Scout tip */}
          <View style={{
            borderWidth: 2,
            borderColor: WK.yellow,
            backgroundColor: 'rgba(245,200,66,0.1)',
            padding: 12,
            marginTop: 18,
          }}>
            <PixelText size={6} color={WK.yellow} style={{ textAlign: 'center', lineHeight: 16 }}>
              ★ FIRST MOVE: HEAD TO THE MARKET AND SET UP YOUR SCOUT — TALENT WON'T FIND ITSELF.
            </PixelText>
          </View>

          <View style={{ marginTop: 20 }}>
            <Button label="▶ LET'S GET STARTED" variant="yellow" fullWidth onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
