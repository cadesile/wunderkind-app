import { enableScreens } from 'react-native-screens';
import '../global.css';
import { Stack } from 'expo-router';

enableScreens();
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { syncQueue } from '@/api/syncQueue';
import { WK } from '@/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
    // Sync is managed by syncQueue; other mutations (sign coach, etc.) get one retry
    mutations: { retry: 1 },
  },
});

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: WK.greenDark, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={WK.yellow} />
    </View>
  );
}

function AppNavigator() {
  const [fontsLoaded, fontError] = useFonts({ PressStart2P_400Regular });
  const { isReady, isOnboarding, registerAcademy } = useAuthFlow();

  // Restore any persisted sync queue items from previous sessions
  useEffect(() => {
    void syncQueue.init();
  }, []);

  // Wait for both font and auth to be ready
  if ((!fontsLoaded && !fontError) || !isReady) {
    return <LoadingScreen />;
  }

  if (isOnboarding) {
    return <OnboardingScreen onRegister={registerAcademy} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AppNavigator />
    </QueryClientProvider>
  );
}
