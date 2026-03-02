import { useState } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  onRegister: (academyName: string) => Promise<void>;
}

export function OnboardingScreen({ onRegister }: Props) {
  const [academyName, setAcademyName] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = academyName.trim().length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onRegister(academyName.trim());
    } catch (err) {
      Alert.alert('Could not create academy', 'Please check your connection and try again.');
      console.error('[Onboarding] registerAcademy failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 0 }}>

          {/* Logo / title */}
          <View style={{ marginBottom: 32, alignItems: 'center' }}>
            <PixelText size={14} upper style={{ textAlign: 'center', marginBottom: 8 }}>
              WUNDERKIND
            </PixelText>
            <PixelText size={8} upper style={{ textAlign: 'center', marginBottom: 6 }}>
              FACTORY
            </PixelText>
            <View style={{ height: 3, width: 80, backgroundColor: WK.yellow, marginTop: 8 }} />
            <PixelText size={6} dim style={{ textAlign: 'center', marginTop: 12 }}>
              BUILD THE NEXT GENERATION
            </PixelText>
          </View>

          {/* Input card */}
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 16,
            marginBottom: 12,
            ...pixelShadow,
          }}>
            <PixelText size={7} dim style={{ marginBottom: 10 }}>ACADEMY NAME</PixelText>
            <TextInput
              style={{
                backgroundColor: WK.tealDark,
                borderWidth: 2,
                borderColor: loading ? WK.dim : WK.tealLight,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: WK.text,
                fontFamily: WK.font,
                fontSize: 8,
                marginBottom: 4,
              }}
              placeholder="E.G. NORTH STAR FC"
              placeholderTextColor={WK.dim}
              value={academyName}
              onChangeText={setAcademyName}
              maxLength={40}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Submit button */}
          {loading ? (
            <View style={{
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: WK.yellow,
              backgroundColor: 'rgba(245,200,66,0.15)',
            }}>
              <ActivityIndicator color={WK.yellow} />
            </View>
          ) : (
            <Button
              label="▶ CREATE MY ACADEMY"
              variant="yellow"
              fullWidth
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          )}

          <PixelText size={6} dim style={{ textAlign: 'center', marginTop: 16 }}>
            YOU'LL RECEIVE 5 YOUTH PLAYERS
          </PixelText>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
