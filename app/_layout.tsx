import { enableScreens } from 'react-native-screens';
import '../global.css';
import { Stack } from 'expo-router';

enableScreens();
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { clearAllAcademyData } from '@/stores/resetAllStores';
import { useNarrativeSync } from '@/hooks/useNarrativeSync';
import { useGameConfigSync } from '@/hooks/useGameConfigSync';
import { useArchetypeSync } from '@/hooks/useArchetypeSync';
import { useProspectSync } from '@/hooks/useProspectSync';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { WelcomeSplash } from '@/components/WelcomeSplash';
import { syncQueue } from '@/api/syncQueue';
import { WK } from '@/constants/theme';
import { useAcademyStore } from '@/stores/academyStore';

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
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P_400Regular,
    FlagsColorWorld: require('../assets/fonts/FlagsColorWorld.ttf'),
  });
  const { isReady, isOnboarding, registerAcademy, showWelcomeSplash, dismissWelcomeSplash } = useAuthFlow();
  const academyName = useAcademyStore((s) => s.academy.name);
  useNarrativeSync();
  useGameConfigSync();
  useArchetypeSync();
  useProspectSync();

  // Tracks whether the player tapped "START AGAIN" on the game over screen
  const [newGameOnboarding, setNewGameOnboarding] = useState(false);
  const pendingNewGame = useLossConditionStore((s) => s.pendingNewGame);

  // Restore any persisted sync queue items from previous sessions
  useEffect(() => {
    void syncQueue.init();
  }, []);

  // React to the game over screen's "START AGAIN" request
  useEffect(() => {
    if (!pendingNewGame) return;
    async function doNewGameReset() {
      // Clear AsyncStorage for all stores and reset critical in-memory state
      await clearAllAcademyData();
      // clearAllAcademyData calls resetInMemoryStores() which clears auth;
      // also explicitly reset lossConditionStore in memory
      useLossConditionStore.getState().resetAll();
      setNewGameOnboarding(true);
    }
    void doNewGameReset();
  }, [pendingNewGame]);

  // Wait for both font and auth to be ready
  if ((!fontsLoaded && !fontError) || !isReady) {
    return <LoadingScreen />;
  }

  if (isOnboarding || newGameOnboarding) {
    return (
      <OnboardingScreen
        onRegister={async (name, country, managerProfile) => {
          setNewGameOnboarding(false);
          await registerAcademy(name, country, managerProfile);
        }}
      />
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {showWelcomeSplash && (
        <WelcomeSplash
          academyName={academyName}
          onDismiss={dismissWelcomeSplash}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AppNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
