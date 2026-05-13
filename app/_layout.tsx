import { enableScreens } from 'react-native-screens';
import '../global.css';
import { Stack } from 'expo-router';

enableScreens();
import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { CREATE_SCHEMA, MIGRATIONS } from '@/db/schema';
import { setDatabase } from '@/db/client';
import { queryClient } from '@/api/queryClient';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useLossConditionStore } from '@/stores/lossConditionStore';
import { clearAllClubData } from '@/stores/resetAllStores';
import { useSQLiteContext } from 'expo-sqlite';
import { loadSeasonFixtures } from '@/db/repositories/fixtureRepository';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useNarrativeSync } from '@/hooks/useNarrativeSync';
import { fetchAndCacheGameConfig } from '@/hooks/useGameConfigSync';
import { useArchetypeSync } from '@/hooks/useArchetypeSync';
import { useProspectSync } from '@/hooks/useProspectSync';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { InitializationScreen } from '@/components/InitializationScreen';
import { WelcomeSplash } from '@/components/WelcomeSplash';
import { syncQueue } from '@/api/syncQueue';
import { WK } from '@/constants/theme';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';

// Keep the native splash visible until AppNavigator signals it's ready
SplashScreen.preventAutoHideAsync();


function AppNavigator() {
  const db = useSQLiteContext();
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P_400Regular,
    VT323_400Regular,
    FlagsColorWorld: require('../assets/fonts/FlagsColorWorld.ttf'),
  });
  const { isReady, isOnboarding, needsInitialization, registerClub, onInitializationComplete, showWelcomeSplash, dismissWelcomeSplash, enabledCountries } = useAuthFlow();
  const clubName = useClubStore((s) => s.club.name);
  useNarrativeSync(isReady && !isOnboarding);
  useArchetypeSync(isReady && !isOnboarding);
  useProspectSync(isReady && !isOnboarding);

  // Tracks whether the player tapped "START AGAIN" on the game over screen
  const [newGameOnboarding, setNewGameOnboarding] = useState(false);
  const pendingNewGame = useLossConditionStore((s) => s.pendingNewGame);

  // Config gate: must have a valid GameConfig before entering the main UI
  const [configReady, setConfigReady] = useState(false);
  const [configError, setConfigError] = useState(false);

  // Zustand persist hydration gate — waits for AsyncStorage rehydration on both
  // critical stores before allowing the main UI to render, preventing stale-state flicker
  const [storesHydrated, setStoresHydrated] = useState(false);

  useEffect(() => {
    async function waitForHydration() {
      const stores = [useClubStore, useSquadStore] as const;
      for (const store of stores) {
        if (!store.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = store.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }
      }
      setStoresHydrated(true);

      // Clubs are NOT persisted by Zustand (stored per-league in AsyncStorage).
      // For returning users, reload them into memory once the meta store has rehydrated.
      if (useWorldStore.getState().isInitialized) {
        void useWorldStore.getState().loadClubs();
      }
    }
    void waitForHydration();
  }, []);

  useEffect(() => {
    const weekNumber = useClubStore.getState().club.weekNumber ?? undefined;
    void fetchAndCacheGameConfig(weekNumber).then((ok) => {
      if (ok) {
        setConfigReady(true);
      } else {
        setConfigError(true);
      }
    });
  }, []);

  // Restore any persisted sync queue items from previous sessions
  useEffect(() => {
    void syncQueue.init();
  }, []);

  // Hydrate fixtureStore from SQLite once the app is ready and stores have rehydrated
  useEffect(() => {
    if (!isReady || isOnboarding || !storesHydrated) return;
    async function hydrateFixtures() {
      const leagueState = useLeagueStore.getState();
      const leagueId = leagueState.league?.id;
      const season = leagueState.currentSeason;
      if (!leagueId || !season) return;
      const fixtures = await loadSeasonFixtures(db, leagueId, season);
      if (fixtures.length > 0) {
        useFixtureStore.getState().setFixtures(fixtures);
      }
    }
    void hydrateFixtures();
  }, [isReady, isOnboarding, storesHydrated, db]);

  // React to the game over screen's "START AGAIN" request
  useEffect(() => {
    if (!pendingNewGame) return;
    async function doNewGameReset() {
      // Clear AsyncStorage for all stores and reset critical in-memory state
      await clearAllClubData();
      // clearAllClubData calls resetInMemoryStores() which clears auth;
      // also explicitly reset lossConditionStore in memory
      useLossConditionStore.getState().resetAll();
      setNewGameOnboarding(true);
    }
    void doNewGameReset();
  }, [pendingNewGame]);

  const isFullyReady = (fontsLoaded || !!fontError) && isReady && configReady && storesHydrated;

  // Hide the native splash only once every gate has passed — prevents any flicker
  // between the static splash frame and the first pixel-art render
  useEffect(() => {
    if (isFullyReady) {
      void SplashScreen.hideAsync();
    }
  }, [isFullyReady]);

  // Hard block: first launch with no network — config has never been cached
  if (configError) {
    return (
      <View style={{ flex: 1, backgroundColor: WK.greenDark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <PixelText size={8} upper color={WK.red} style={{ textAlign: 'center', marginBottom: 16 }}>
          COULD NOT LOAD GAME CONFIG
        </PixelText>
        <PixelText size={6} dim style={{ textAlign: 'center', marginBottom: 24 }}>
          CHECK YOUR CONNECTION AND RETRY
        </PixelText>
        <Button
          label="RETRY"
          variant="yellow"
          onPress={() => {
            setConfigError(false);
            void fetchAndCacheGameConfig().then((ok) => {
              if (ok) setConfigReady(true);
              else setConfigError(true);
            });
          }}
        />
      </View>
    );
  }

  // Return null while gates are pending — native splash remains visible, zero flicker
  if (!isFullyReady) return null;

  if (isOnboarding || newGameOnboarding) {
    return (
      <OnboardingScreen
        onRegister={async (name, country, managerProfile) => {
          await registerClub(name, country, managerProfile);
          setNewGameOnboarding(false);
        }}
        enabledCountries={enabledCountries}
      />
    );
  }

  if (needsInitialization) {
    return <InitializationScreen onComplete={onInitializationComplete} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {showWelcomeSplash && (
        <WelcomeSplash
          clubName={clubName}
          onDismiss={dismissWelcomeSplash}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="wk.db"
      onInit={async (db) => {
        await db.execAsync(CREATE_SCHEMA);
        for (const migration of MIGRATIONS) {
          try { await db.execAsync(migration); } catch { /* column already exists */ }
        }
        setDatabase(db);
      }}
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
