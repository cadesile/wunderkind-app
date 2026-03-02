import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      Alert.alert(
        'Could not create academy',
        'Please check your connection and try again.',
      );
      console.error('[Onboarding] registerAcademy failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Branding */}
          <Text className="text-4xl font-bold text-gray-900 mb-1">
            Wunderkind
          </Text>
          <Text className="text-base text-gray-400 mb-12">
            Build the next generation of football stars.
          </Text>

          {/* Academy name input */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Academy Name
          </Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 mb-6"
            placeholder="e.g. North Star Academy"
            placeholderTextColor="#9CA3AF"
            value={academyName}
            onChangeText={setAcademyName}
            maxLength={40}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-xl py-4 items-center ${
              canSubmit ? 'bg-blue-500' : 'bg-blue-200'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Create My Academy
              </Text>
            )}
          </Pressable>

          <Text className="text-xs text-gray-400 text-center mt-6">
            You'll receive 5 youth players to start your journey.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
