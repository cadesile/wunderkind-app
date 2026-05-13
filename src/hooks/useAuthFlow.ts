import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useMarketStore } from '@/stores/marketStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { register, login } from '@/api/endpoints/auth';
import { checkClub } from '@/api/endpoints/club';
import { marketApi } from '@/api/endpoints/market';
import { fetchStarterConfig } from '@/api/endpoints/starterConfig';
import { ApiError } from '@/types/api';
import { clearAllClubData } from '@/stores/resetAllStores';
import { useWorldStore } from '@/stores/worldStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClubCountryCode } from '@/utils/nationality';
import type { ManagerProfileInput, ApiGuardian } from '@/types/api';
import type { ManagerProfile, ClubTier } from '@/types/club';
import { TIER_REPUTATION_BASELINE } from '@/types/club';
import type { Guardian } from '@/types/guardian';
import type { Player } from '@/types/player';

/** Migration helper: populates guardians for players who pre-date the guardian system. */
function storeBackendGuardians(playerId: string, apiGuardians: ApiGuardian[]): void {
  if (!apiGuardians || apiGuardians.length === 0) return;
  const guardians: Guardian[] = apiGuardians.map((g) => ({
    id:                  g.id,
    playerId,
    firstName:           g.firstName,
    lastName:            g.lastName,
    gender:              g.gender,
    demandLevel:         g.demandLevel,
    loyaltyToClub:       g.loyaltyToClub,
    ignoredRequestCount: 0,
  }));
  useGuardianStore.getState().addGuardians(guardians);
}

function backfillGuardians(players: Player[]): void {
  const guardianStore = useGuardianStore.getState();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const marketPlayers = require('@/stores/marketStore').useMarketStore.getState().players as import('@/types/market').MarketPlayer[];
  for (const player of players) {
    if (guardianStore.getGuardiansForPlayer(player.id).length > 0) continue;
    const mp = marketPlayers.find((m) => m.id === player.id);
    if (mp?.guardians && mp.guardians.length > 0) {
      storeBackendGuardians(player.id, mp.guardians);
    } else {
      console.warn(`[backfillGuardians] No backend guardian data for player ${player.id} — guardians will be absent until next sync.`);
    }
  }
}

function generateDeviceEmail(): string {
  const chars = 'abcdef0123456789';
  const id = Array.from({ length: 24 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
  return `wk-${id}@device.wunderkind.app`;
}

function generateDevicePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 20 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

/** Init checkpoint keys — must match useInitFlow constants */
const INIT_CHECKPOINT_KEYS = [
  'wk:init:starter_at',
  'wk:init:amp_starter',
  'wk:init:leagues',
  'wk:init:completed_tiers',
];

export interface AuthFlowResult {
  isReady:                  boolean;
  isOnboarding:             boolean;
  /** True when auth is complete but world initialization has not yet finished */
  needsInitialization:      boolean;
  registerClub:             (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
  onInitializationComplete: () => void;
  showWelcomeSplash:        boolean;
  dismissWelcomeSplash:     () => void;
  enabledCountries:         string[];
}

/**
 * Manages the app auth lifecycle:
 *
 * 1. Token present → check club exists → ready (go to Hub or init screen if not yet initialized)
 * 2. Credentials present (token expired) → silent re-login → same check
 * 3. First launch (no credentials) → isOnboarding=true → call registerClub() to complete auth setup
 *
 * World initialization (the 3-step multi-tier flow) is handled by useInitFlow, not here.
 * registerClub() now only: authenticates, sets up club metadata, and flags needsInitialization=true.
 */
export function useAuthFlow(): AuthFlowResult {
  const { token, email, password, setToken, setTokens, setCredentials, setUserId } =
    useAuthStore();
  const { setName: setClubName, addBalance, setCreatedAt, setSponsorIds, setInvestorId, setCountry, setManagerProfile, setReputation } =
    useClubStore();
  const { initAllLevels } = useFacilityStore();
  const { fetchMarketData } = useMarketStore();

  const [isReady,             setIsReady]             = useState(false);
  const [isOnboarding,        setIsOnboarding]        = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [showWelcomeSplash,   setShowWelcomeSplash]   = useState(false);
  const [enabledCountries,    setEnabledCountries]    = useState<string[]>(['EN']);

  useEffect(() => {
    async function initialize() {
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      const { token, email, password } = useAuthStore.getState();

      if (token) {
        try {
          const { exists } = await checkClub();
          if (!exists) {
            console.warn('[useAuthFlow] Club not found on backend — clearing data and redirecting to onboarding');
            await clearAllClubData();
            setIsOnboarding(true);
            setIsReady(true);
            return;
          }
        } catch {
          // Network/timeout — proceed with cached data
        }

        // If world not yet initialized, show the init screen to complete or resume
        if (!useWorldStore.getState().isInitialized) {
          setNeedsInitialization(true);
        }
        setIsReady(true);
        backfillGuardians(useSquadStore.getState().players);
        void fetchMarketData();
        return;
      }

      if (email && password) {
        try {
          const loginResp = await login({ username: email, password });
          if (loginResp.refresh_token) {
            setTokens(loginResp.token, loginResp.refresh_token);
          } else {
            setToken(loginResp.token);
          }

          try {
            const { exists } = await checkClub();
            if (!exists) {
              console.warn('[useAuthFlow] Club not found after re-login — clearing data and redirecting to onboarding');
              await clearAllClubData();
              setIsOnboarding(true);
              setIsReady(true);
              return;
            }
          } catch {
            // Network/timeout — proceed
          }

          if (!useWorldStore.getState().isInitialized) {
            setNeedsInitialization(true);
          }
          backfillGuardians(useSquadStore.getState().players);
          void fetchMarketData();
        } catch (err) {
          console.warn('[useAuthFlow] Re-login failed:', err);
        }
        setIsReady(true);
        return;
      }

      setIsOnboarding(true);
      setIsReady(true);
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStarterConfig()
      .then((cfg) => setEnabledCountries(cfg.enabledCountries ?? ['EN']))
      .catch(() => {});
  }, []);

  /**
   * Called after the user completes the onboarding form.
   * Handles auth (register + login), sets up club metadata, then transitions
   * to the initialization screen via needsInitialization=true.
   *
   * World data (squad, NPC clubs, fixtures) is handled by useInitFlow.
   */
  async function registerClub(clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile): Promise<void> {
    // Clear any stale init checkpoint data from a prior run (e.g. "START AGAIN" flow)
    try {
      await AsyncStorage.multiRemove(INIT_CHECKPOINT_KEYS);
    } catch { /* non-critical */ }

    const starterConfig = await fetchStarterConfig();

    const userEmail    = generateDeviceEmail();
    const userPassword = generateDevicePassword();

    setManagerProfile(managerProfile);

    const managerInput: ManagerProfileInput = {
      name:        managerProfile.name,
      dateOfBirth: managerProfile.dateOfBirth,
      gender:      managerProfile.gender,
      nationality: managerProfile.nationality,
    };

    setCredentials(userEmail, userPassword);
    try {
      const registered = await register({
        email:    userEmail,
        password: userPassword,
        manager:  managerInput,
      });
      setUserId(registered.id);

      const loginResp = await login({ username: userEmail, password: userPassword });
      if (loginResp.refresh_token) {
        setTokens(loginResp.token, loginResp.refresh_token);
      } else {
        setToken(loginResp.token);
      }
    } catch (err) {
      const status = err instanceof ApiError ? ` (HTTP ${err.status}: ${err.message})` : '';
      console.warn(`[useAuthFlow] Backend registration unavailable${status} — continuing offline`);
    }

    // Club metadata
    const startingBalance = starterConfig.startingBalance;
    const clubTier        = starterConfig.starterClubTier;

    setCreatedAt(new Date().toISOString());
    addBalance(startingBalance);
    setReputation(TIER_REPUTATION_BASELINE[clubTier as ClubTier] ?? 0);
    initAllLevels(starterConfig.defaultFacilities);
    setCountry(country);
    setClubName(clubName);
    setSponsorIds([]);
    setInvestorId(null);
    useClubStore.getState().setStadiumName(`${clubName} Stadium`);

    // Create the club on the backend; warm market data cache in background
    const [clubResult] = await Promise.allSettled([
      marketApi.initializeClub(clubName, country, managerInput),
      fetchMarketData(),
    ]);

    if (clubResult.status === 'fulfilled') {
      useClubStore.getState().setId(clubResult.value.id);
    } else {
      const err = clubResult.reason;
      const status = err instanceof ApiError ? ` (HTTP ${err.status}: ${err.message})` : '';
      console.warn(`[useAuthFlow] Club creation failed${status} — world init will proceed anyway`);
    }

    // Transition to the initialization screen
    setIsOnboarding(false);
    setNeedsInitialization(true);
  }

  function onInitializationComplete(): void {
    setNeedsInitialization(false);
    setShowWelcomeSplash(true);
  }

  return {
    isReady,
    isOnboarding,
    needsInitialization,
    registerClub,
    onInitializationComplete,
    showWelcomeSplash,
    dismissWelcomeSplash: () => setShowWelcomeSplash(false),
    enabledCountries,
  };
}
