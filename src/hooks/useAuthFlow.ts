import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useMarketStore } from '@/stores/marketStore';
import { register, login } from '@/api/endpoints/auth';
import { checkClub } from '@/api/endpoints/club';
import { marketApi } from '@/api/endpoints/market';
import { fetchStarterConfig } from '@/api/endpoints/starterConfig';
import { ApiError } from '@/types/api';
import { clearAllClubData } from '@/stores/resetAllStores';
import { generatePersonality } from '@/engine/personality';
import { useGuardianStore } from '@/stores/guardianStore';
import type { ApiGuardian } from '@/types/api';
import type { Guardian } from '@/types/guardian';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import { randomBaseMorale } from '@/utils/morale';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import type { Scout } from '@/types/market';
import type { Player, Position } from '@/types/player';
import type { Coach, CoachRole } from '@/types/coach';
import type { ClubCountryCode } from '@/utils/nationality';
import type { ManagerProfileInput } from '@/types/api';
import type { ManagerProfile, ClubTier } from '@/types/club';
import { TIER_REPUTATION_BASELINE } from '@/types/club';
import { initializeWorld } from '@/api/endpoints/initialize';
import { useWorldStore } from '@/stores/worldStore';
import type { WorldPlayer, WorldStaff } from '@/types/world';

function generateDeviceEmail(): string {
  const chars = 'abcdef0123456789';
  const id = Array.from({ length: 24 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
  return `wk-${id}@device.wunderkind.app`;
}

function generateDevicePassword(): string {
  // Alphanumeric only — avoids JSON escaping edge-cases in any HTTP middleware
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 20 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

/** Map backend ApiGuardian array to Guardian objects and store them for a player. */
function storeBackendGuardians(playerId: string, apiGuardians: ApiGuardian[]): void {
  if (!apiGuardians || apiGuardians.length === 0) return;
  const guardians: Guardian[] = apiGuardians.map((g) => ({
    id: g.id,
    playerId,
    firstName: g.firstName,
    lastName: g.lastName,
    gender: g.gender,
    demandLevel: g.demandLevel,
    loyaltyToClub: g.loyaltyToClub,
    ignoredRequestCount: 0,
  }));
  useGuardianStore.getState().addGuardians(guardians);
}

/**
 * For returning users: ensure any already-stored squad player without guardians
 * gets them if the market store still holds their data (guardians nested on MarketPlayer).
 * This covers the gap between when guardian data was added to the backend and existing
 * persisted sessions that missed the bootstrap storeBackendGuardians calls.
 */
function backfillGuardians(players: Player[]): void {
  const guardianStore = useGuardianStore.getState();
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

const STAFF_ROLE_MAP: Record<string, CoachRole> = {
  head_coach:      'Head Coach',
  fitness_coach:   'Fitness Coach',
  analyst:         'Tactical Analyst',
  assistant_coach: 'Youth Coach',
};

/** Build a Player from a WorldPlayer delivered in the ampStarter pack. */
function worldPlayerToPlayer(wp: WorldPlayer, weekNumber: number): Player {
  // Personality is generated client-side (not from backend values) because
  // the game's personality system is client-authoritative. Backend personality
  // data is used only for NPC club display, not for AMP squad mechanics.
  const personality = generatePersonality();
  const pos: Position = wp.position === 'ATT' ? 'FWD' : wp.position as Position;
  const gameDate = getGameDate(weekNumber);
  const ageRaw = wp.dateOfBirth ? computePlayerAge(wp.dateOfBirth, gameDate) : 14;
  const age = typeof ageRaw === 'number' ? ageRaw : 14;
  const overallRating = Math.round(
    (wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6,
  );
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id: wp.id,
    name: `${wp.firstName} ${wp.lastName}`,
    dateOfBirth: wp.dateOfBirth,
    age,
    position: pos,
    nationality: wp.nationality,
    overallRating,
    potential: overallRating,
    wage: overallRating * 100,
    personality,
    appearance: generateAppearance(wp.id, 'PLAYER', age, personality),
    agentId: null,
    joinedWeek: weekNumber,
    isActive: true,
    morale: randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    relationships: [],
    enrollmentEndWeek: weekNumber + 52,
    extensionCount: 0,
    attributes: {
      pace:      wp.pace,
      technical: wp.technical,
      vision:    wp.vision,
      power:     wp.power,
      stamina:   wp.stamina,
      heart:     wp.heart,
    },
  } as Player;
}

/** Build a Coach from a WorldStaff entry in the ampStarter pack. */
function worldStaffToCoach(ws: WorldStaff, weekNumber: number): Coach {
  const personality = generatePersonality();
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id: ws.id,
    name: `${ws.firstName} ${ws.lastName}`,
    role: STAFF_ROLE_MAP[ws.role] ?? 'Youth Coach',
    salary: ws.coachingAbility * 100,
    influence: Math.max(1, Math.min(20, Math.round(ws.coachingAbility / 5))),
    personality,
    appearance: generateAppearance(ws.id, 'COACH', 35, personality),
    nationality: ws.nationality ?? '',
    joinedWeek: weekNumber,
    morale: randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    specialisms: undefined,
    relationships: [],
  };
}

/** Build a Scout from a WorldStaff entry in the ampStarter pack. */
function worldStaffToScout(ws: WorldStaff, weekNumber: number): Scout {
  const scoutingRange: Scout['scoutingRange'] =
    ws.coachingAbility >= 80 ? 'international' : ws.coachingAbility >= 40 ? 'national' : 'local';
  const successRate = Math.min(90, Math.round(40 + (ws.coachingAbility / 100) * 50));
  const salary = ws.coachingAbility > 0 ? ws.coachingAbility * 300 : successRate * 300;
  const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
  return {
    id: ws.id,
    name: `${ws.firstName} ${ws.lastName}`,
    salary,
    scoutingRange,
    successRate,
    nationality: ws.nationality,
    joinedWeek: weekNumber,
    appearance: generateAppearance(ws.id, 'SCOUT', 35),
    morale: randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
    relationships: [],
    assignedPlayerIds: [],
  };
}

export interface AuthFlowResult {
  isReady: boolean;
  isOnboarding: boolean;
  registerClub: (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
  showWelcomeSplash: boolean;
  dismissWelcomeSplash: () => void;
  enabledCountries: string[];
}

/**
 * Manages the full app auth lifecycle:
 *
 * 1. Token present → ready immediately; refresh market data in background.
 * 2. Credentials present (token expired) → silent re-login → ready; refresh market data.
 * 3. First launch (no credentials) → isOnboarding=true; call
 *    registerClub(name) from the onboarding screen to complete setup.
 *
 * Bootstraps a new club:
 * 1. Register / find the club via initializeClub
 * 2. Call POST /api/initialize to receive the world pack and AMP starter squad
 * 3. Populate worldStore with NPC world data
 * 4. Map ampStarter players/staff to local types and populate stores
 * 5. Apply club settings (balance, reputation, facilities, sponsor, investor)
 */
export function useAuthFlow(): AuthFlowResult {
  const { token, email, password, setToken, setTokens, setCredentials, setUserId } =
    useAuthStore();
  const { setName: setClubName, addBalance, setCreatedAt, setSponsorIds, setInvestorId, setCountry, setManagerProfile, setReputation } =
    useClubStore();
  const { setPlayers } = useSquadStore();
  const { addCoach } = useCoachStore();
  const { addScout } = useScoutStore();
  const { initAllLevels } = useFacilityStore();
  const { fetchMarketData } = useMarketStore();
  const setFromWorldPack = useWorldStore((s) => s.setFromWorldPack);

  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);
  const [enabledCountries, setEnabledCountries] = useState<string[]>(['EN']);

  useEffect(() => {
    async function initialize() {
      // On web, AsyncStorage (backed by localStorage) rehydrates the Zustand store
      // asynchronously. If we read token/email/password from the hook closure before
      // hydration completes, they are null even when valid credentials are stored —
      // causing a spurious re-registration and subsequent 401s on authenticated calls.
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      // Read fresh post-hydration values rather than the stale closure snapshot.
      const { token, email, password } = useAuthStore.getState();

      if (token) {
        // Verify the club still exists on the backend.
        // On 404 → wipe all local data and send the user back to onboarding.
        // On network error → proceed normally (transient failure, data is fine).
        try {
          const { exists } = await checkClub();
          if (!exists) {
            console.warn('[useAuthFlow] Club not found on backend — clearing data and redirecting to onboarding');
            await clearAllClubData();
            setIsOnboarding(true);
            setIsReady(true);
            return;
          }
        } catch (err) {
          // Network/timeout — do nothing, proceed with cached data
          console.warn('[useAuthFlow] Club check failed (network) — proceeding with cached data:', err);
        }

        setIsReady(true);
        // Backfill guardians for any existing squad players that pre-date the guardian system
        backfillGuardians(useSquadStore.getState().players);
        // Refresh market data in background — respects 5-min cache, safe to fire & forget
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

          // Same club existence check after re-login
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
            // Network/timeout — proceed with cached data
          }

          // Refresh market data after successful re-login
          void fetchMarketData();
        } catch (err) {
          console.warn('[useAuthFlow] Re-login failed:', err);
        }
        backfillGuardians(useSquadStore.getState().players);
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
      .catch(() => {}); // keep default ['EN'] on failure
  }, []);

  async function registerClub(clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile): Promise<void> {
    // Fetch starter config — required, no fallback. Throws if unavailable.
    const starterConfig = await fetchStarterConfig();

    const userEmail = generateDeviceEmail();
    const userPassword = generateDevicePassword();

    // Persist manager profile locally immediately
    setManagerProfile(managerProfile);

    // Build API-safe manager input (exclude local-only appearance field)
    const managerInput: ManagerProfileInput = {
      name: managerProfile.name,
      dateOfBirth: managerProfile.dateOfBirth,
      gender: managerProfile.gender,
      nationality: managerProfile.nationality,
    };

    // 1. Auth — store credentials first so re-login can be retried on next launch
    setCredentials(userEmail, userPassword);
    try {
      const registered = await register({
        email: userEmail,
        password: userPassword,
        manager: managerInput,
      });
      setUserId(registered.id);

      const loginResp = await login({
        username: userEmail,
        password: userPassword,
      });
      if (loginResp.refresh_token) {
        setTokens(loginResp.token, loginResp.refresh_token);
      } else {
        setToken(loginResp.token);
      }
    } catch (err) {
      const status = err instanceof ApiError ? ` (HTTP ${err.status}: ${err.message})` : '';
      console.warn(`[useAuthFlow] Backend registration unavailable${status} — continuing offline`);
    }

    // Use config values everywhere previously hardcoded
    const startingBalance = starterConfig.startingBalance;
    const clubTier = starterConfig.starterClubTier;

    const sponsorIds: string[] = [];
    const investorId = null;

    // 4. Club setup
    setCreatedAt(new Date().toISOString());
    addBalance(startingBalance);
    // Set initial reputation from the club tier baseline
    const tierBaseline = TIER_REPUTATION_BASELINE[clubTier as ClubTier] ?? 0;
    setReputation(tierBaseline);
    initAllLevels();

    const weekNumber = 1;

    // 2. Create the club on the backend (sets name + country, required before /api/initialize)
    try {
      const clubResp = await marketApi.initializeClub(clubName, country, managerInput);
      // Persist the real backend UUID immediately so setFromWorldPack reads the correct club ID
      // when generating fixtures — without this, fixtures are generated with the default 'club-1'
      // and the AMP's matches are never matched against the real club ID after the first sync.
      useClubStore.getState().setId(clubResp.id);
    } catch (err) {
      const status = err instanceof ApiError ? ` (HTTP ${err.status}: ${err.message})` : '';
      console.warn(`[useAuthFlow] Club creation failed${status} — world init will be skipped`);
    }

    // Set country before world init so setFromWorldPack can read it for bottom-league detection.
    setCountry(country);

    // 3. World initialization — single call replaces fetchMarketData + assignMarketEntity loop
    let players:         Player[] = [];
    let assignedCoaches: Coach[]  = [];
    let assignedScouts:  Scout[]  = [];

    try {
      const initResp = await initializeWorld();
      const { ampStarter } = initResp.worldPack;

      // Store NPC world in worldStore
      await setFromWorldPack(initResp.worldPack);

      // Map AMP starter entities to local types
      players         = ampStarter.players.map((wp) => worldPlayerToPlayer(wp, weekNumber));
      assignedCoaches = ampStarter.staff
        .filter((s) => s.role !== 'scout')
        .map((ws) => worldStaffToCoach(ws, weekNumber));
      assignedScouts  = ampStarter.staff
        .filter((s) => s.role === 'scout')
        .map((ws) => worldStaffToScout(ws, weekNumber));

      console.log(`[useAuthFlow] World initialized: ${players.length}p / ${assignedCoaches.length}c / ${assignedScouts.length}s`);
    } catch (err) {
      console.error('[useAuthFlow] World initialization failed — squad will be empty:', err);
    }

    setPlayers(players);
    backfillGuardians(players);
    for (const coach of assignedCoaches) { addCoach(coach); }
    for (const scout of assignedScouts) { addScout(scout); }

    // 7. Apply sponsor/investor assignments
    setSponsorIds(sponsorIds);
    setInvestorId(investorId);

    // 8. Finalise
    setClubName(clubName);
    setShowWelcomeSplash(true);
    setIsOnboarding(false);
  }

  return {
    isReady,
    isOnboarding,
    registerClub,
    showWelcomeSplash,
    dismissWelcomeSplash: () => setShowWelcomeSplash(false),
    enabledCountries,
  };
}
