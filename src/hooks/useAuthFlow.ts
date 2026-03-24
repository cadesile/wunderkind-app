import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useMarketStore } from '@/stores/marketStore';
import { register, login } from '@/api/endpoints/auth';
import { checkAcademy } from '@/api/endpoints/academy';
import { ApiError, ApiPlayerDetail, ApiStaffMember } from '@/types/api';
import { marketApi } from '@/api/endpoints/market';
import { clearAllAcademyData } from '@/stores/resetAllStores';
import { getSquad } from '@/api/endpoints/squad';
import { getStaff } from '@/api/endpoints/staff';
import { generatePlayer, generatePersonality } from '@/engine/personality';
import { generateCoachProspect, generateScout as generateLocalScout } from '@/engine/recruitment';
import { generateAppearance } from '@/engine/appearance';
import { computePlayerAge, getGameDate } from '@/utils/gameDate';
import type { MarketData, MarketPlayer, MarketCoach, MarketScout, Scout } from '@/types/market';
import type { Player, Position } from '@/types/player';
import type { Coach, CoachRole } from '@/types/coach';
import type { AcademyCountryCode } from '@/utils/nationality';
import { ACADEMY_CODE_TO_NATIONALITY } from '@/utils/nationality';
import type { ManagerProfileInput } from '@/types/api';
import type { ManagerProfile } from '@/types/academy';

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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const STAFF_ROLE_MAP: Record<string, CoachRole> = {
  head_coach:      'Head Coach',
  fitness_coach:   'Fitness Coach',
  analyst:         'Tactical Analyst',
  assistant_coach: 'Youth Coach',
};

/** Build a Player from the backend market pool entry (full data). */
function marketPlayerToPlayer(mp: MarketPlayer, weekNumber: number, gameDate: Date): Player {
  const personality = generatePersonality();
  const ageRaw = mp.dateOfBirth ? computePlayerAge(mp.dateOfBirth, gameDate) : 14;
  const age = typeof ageRaw === 'number' ? ageRaw : 14;
  return {
    id: mp.id,
    name: `${mp.firstName} ${mp.lastName}`,
    dateOfBirth: mp.dateOfBirth,
    age,
    position: mp.position,
    nationality: mp.nationality,
    overallRating: mp.currentAbility,
    potential: mp.potential,
    wage: mp.currentAbility * 100,
    personality,
    appearance: generateAppearance(mp.id, 'PLAYER', age, personality),
    guardianId: null,
    agentId: mp.agent?.id ?? null,
    joinedWeek: weekNumber,
    isActive: true,
    morale: 40,
    relationships: [],
    enrollmentEndWeek: weekNumber + 52,
    extensionCount: 0,
    ...(mp.attributes ? { attributes: mp.attributes } : {}),
  } as Player;
}

/** Fallback: build a Player from the leaner ApiPlayerDetail response. */
function apiPlayerToPlayer(ap: ApiPlayerDetail, weekNumber: number): Player {
  const personality = generatePersonality();
  const pos: Position = ap.position === 'ATT' ? 'FWD' : ap.position as Position;
  // Estimate DOB from static age — approximate but consistent
  const estimatedYear = new Date().getFullYear() - ap.age;
  return {
    id: ap.id,
    name: `${ap.firstName} ${ap.lastName}`,
    dateOfBirth: `${estimatedYear}-07-01`,
    age: ap.age,
    position: pos,
    nationality: ap.nationality,
    overallRating: ap.currentAbility,
    potential: ap.potential,
    wage: ap.currentAbility * 100,
    personality,
    appearance: generateAppearance(ap.id, 'PLAYER', ap.age, personality),
    guardianId: null,
    agentId: ap.agent?.id ?? null,
    joinedWeek: weekNumber,
    isActive: true,
    morale: ap.morale ?? 70,
    relationships: [],
    enrollmentEndWeek: weekNumber + 52,
    extensionCount: 0,
  } as Player;
}

/** Build a Coach from the backend market pool entry (full data including specialisms). */
function marketCoachToCoach(mc: MarketCoach, weekNumber: number): Coach {
  const personality = generatePersonality();
  return {
    id: mc.id,
    name: `${mc.firstName} ${mc.lastName}`,
    role: mc.role,
    salary: mc.salary,
    influence: mc.influence,
    personality,
    appearance: generateAppearance(mc.id, 'COACH', 35, personality),
    nationality: mc.nationality,
    joinedWeek: weekNumber,
    morale: mc.morale ?? 70,
    specialisms: mc.specialisms,
    relationships: [],
  };
}

/** Fallback: build a Coach from ApiStaffMember. */
function apiStaffToCoach(s: ApiStaffMember, weekNumber: number): Coach {
  const personality = generatePersonality();
  return {
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    role: STAFF_ROLE_MAP[s.role] ?? 'Youth Coach',
    salary: s.weeklySalary,
    influence: Math.max(1, Math.min(20, Math.round(s.coachingAbility / 5))),
    personality,
    appearance: generateAppearance(s.id, 'COACH', 35, personality),
    nationality: '',
    joinedWeek: weekNumber,
    morale: s.morale ?? 70,
    relationships: [],
  };
}

/** Build a Scout from the backend market pool entry. */
function marketScoutToScout(ms: MarketScout, weekNumber: number, gameDate: Date): Scout {
  const ageRaw = ms.dateOfBirth ? computePlayerAge(ms.dateOfBirth, gameDate) : 35;
  const age = typeof ageRaw === 'number' ? ageRaw : 35;
  return {
    id: ms.id,
    name: `${ms.firstName} ${ms.lastName}`,
    salary: ms.salary,
    scoutingRange: ms.scoutingRange,
    successRate: ms.successRate,
    nationality: ms.nationality,
    joinedWeek: weekNumber,
    appearance: generateAppearance(ms.id, 'SCOUT', age),
    morale: 70,
    relationships: [],
    assignedPlayerIds: [],
  };
}

/** Fallback: build a Scout from ApiStaffMember. */
function apiStaffToScout(s: ApiStaffMember, weekNumber: number): Scout {
  const successRate = Math.min(90, 40 + s.scoutingRange * 5);
  const scoutingRange: Scout['scoutingRange'] =
    s.scoutingRange >= 8 ? 'international' : s.scoutingRange >= 4 ? 'national' : 'local';
  return {
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    salary: s.weeklySalary,
    scoutingRange,
    successRate,
    nationality: '',
    joinedWeek: weekNumber,
    appearance: generateAppearance(s.id, 'SCOUT', 35),
    morale: s.morale ?? 70,
    relationships: [],
    assignedPlayerIds: [],
  };
}

export interface AuthFlowResult {
  isReady: boolean;
  isOnboarding: boolean;
  registerAcademy: (academyName: string, country: AcademyCountryCode, managerProfile: ManagerProfile) => Promise<void>;
  showWelcomeSplash: boolean;
  dismissWelcomeSplash: () => void;
}

/**
 * Manages the full app auth lifecycle:
 *
 * 1. Token present → ready immediately; refresh market data in background.
 * 2. Credentials present (token expired) → silent re-login → ready; refresh market data.
 * 3. First launch (no credentials) → isOnboarding=true; call
 *    registerAcademy(name) from the onboarding screen to complete setup.
 *
 * registerAcademy bootstrap sequence:
 *   1. register() → login() → store JWT
 *   2. fetchMarketData() → marketStore (rich player/coach/scout pool with attributes)
 *   3. initializeAcademy() → backend assigns players/staff from pool
 *   4. setCreatedAt(), addBalance(startingBalance), facilityStore.initAllLevels()
 *   5. getSquad() → cross-ref with market data → squadStore.setPlayers()
 *   6. getStaff() → cross-ref with market data → coachStore + scoutStore
 *   7. setSponsorIds(), setInvestorId()
 *   8. setAcademyName(), setIsOnboarding(false)
 *
 * Falls back to local generation for steps 5–6 if the network is unavailable.
 */
export function useAuthFlow(): AuthFlowResult {
  const { token, email, password, setToken, setCredentials, setUserId } =
    useAuthStore();
  const { setName: setAcademyName, addBalance, setCreatedAt, setSponsorIds, setInvestorId, setCountry, setManagerProfile } =
    useAcademyStore();
  const { setPlayers } = useSquadStore();
  const { addCoach } = useCoachStore();
  const { addScout } = useScoutStore();
  const { initAllLevels } = useFacilityStore();
  const { setMarketData, fetchMarketData, removeFromMarket } = useMarketStore();

  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);

  useEffect(() => {
    async function initialize() {
      if (token) {
        // Verify the academy still exists on the backend.
        // On 404 → wipe all local data and send the user back to onboarding.
        // On network error → proceed normally (transient failure, data is fine).
        try {
          const { exists } = await checkAcademy();
          if (!exists) {
            console.warn('[useAuthFlow] Academy not found on backend — clearing data and redirecting to onboarding');
            await clearAllAcademyData();
            setIsOnboarding(true);
            setIsReady(true);
            return;
          }
        } catch (err) {
          // Network/timeout — do nothing, proceed with cached data
          console.warn('[useAuthFlow] Academy check failed (network) — proceeding with cached data:', err);
        }

        setIsReady(true);
        // Refresh market data in background — respects 5-min cache, safe to fire & forget
        void fetchMarketData();
        return;
      }

      if (email && password) {
        try {
          const { token: newToken } = await login({ username: email, password });
          setToken(newToken);

          // Same academy existence check after re-login
          try {
            const { exists } = await checkAcademy();
            if (!exists) {
              console.warn('[useAuthFlow] Academy not found after re-login — clearing data and redirecting to onboarding');
              await clearAllAcademyData();
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
        setIsReady(true);
        return;
      }

      setIsOnboarding(true);
      setIsReady(true);
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registerAcademy(academyName: string, country: AcademyCountryCode, managerProfile: ManagerProfile): Promise<void> {
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

      const { token: newToken } = await login({
        username: userEmail,
        password: userPassword,
      });
      setToken(newToken);
    } catch (err) {
      const status = err instanceof ApiError ? ` (HTTP ${err.status}: ${err.message})` : '';
      console.warn(`[useAuthFlow] Backend registration unavailable${status} — continuing offline`);
    }

    // 2. Fetch market data — populates rich player pool (attributes, dateOfBirth, etc.)
    let marketData: MarketData = { players: [], coaches: [], scouts: [], agents: [], investors: [], sponsors: [] };
    try {
      const fetched = await marketApi.getMarketData(country);
      marketData = fetched;
      setMarketData(fetched);
    } catch (err) {
      console.warn('[useAuthFlow] Market data fetch failed — continuing offline:', err);
    }

    // 2b. Ensure the pool has enough home-nationality players before init.
    // Idempotent — no-ops if pool is already full; safe to ignore failures.
    try {
      await marketApi.ensurePool(country, 10);
    } catch (err) {
      console.warn('[useAuthFlow] Pool ensure failed — continuing:', err);
    }

    // 3. Register academy server-side — backend assigns players/staff from pool
    let initResponse: Awaited<ReturnType<typeof marketApi.initializeAcademy>> | null = null;
    try {
      initResponse = await marketApi.initializeAcademy(academyName, country, managerInput);
    } catch (err) {
      console.warn('[useAuthFlow] Academy init failed — continuing offline:', err);
    }

    const backendBalance = initResponse?.starterBundle
      ? (initResponse.starterBundle as Record<string, unknown>).startingBalance
      : undefined;
    // balance is stored in pence; backend sends pence, fallback is £50,000 = 5,000,000p
    const startingBalance = typeof backendBalance === 'number' ? backendBalance : 5_000_000;
    // Starter bundle spec: 1 small sponsor, 0 investors at creation.
    const smallSponsors = marketData.sponsors.filter((s) => s.companySize === 'SMALL');
    const sponsorIds = smallSponsors.slice(0, 1).map((s) => s.id);
    const investorId = null;

    // 4. Academy setup
    setCreatedAt(new Date().toISOString());
    addBalance(startingBalance);
    initAllLevels();

    // 5 & 6. Fetch the backend-assigned squad and staff, cross-referencing with market
    // data for full attribute/specialisms data.
    //
    // Three-tier fallback:
    //   Tier 1 — backend getSquad()/getStaff() with market pool cross-reference
    //   Tier 2 — pick directly from marketData pool (backend assigned but squad endpoint empty)
    //   Tier 3 — local generation (fully offline)
    const weekNumber = 1;
    const gameDate = getGameDate(weekNumber);
    const STARTER_PLAYER_COUNT = 5;
    const STARTER_POSITIONS = ['GK', 'DEF', 'MID', 'MID', 'FWD'] as const;
    const homeNationality = ACADEMY_CODE_TO_NATIONALITY[country];

    let players: Player[] = [];
    let assignedCoaches: Coach[] = [];
    let assignedScouts: Scout[] = [];

    // Tier 1: fetch backend-assigned squad/staff
    try {
      const [squadResp, staffResp] = await Promise.all([getSquad(), getStaff()]);

      const allSquadPlayers = squadResp.players.map((apiPlayer) => {
        const mp = marketData.players.find((p) => p.id === apiPlayer.id);
        return mp
          ? marketPlayerToPlayer(mp, weekNumber, gameDate)
          : apiPlayerToPlayer(apiPlayer, weekNumber);
      });
      // Safety net: starting academy is always Local tier, so enforce home nationality.
      // Guards against the backend migration not yet being applied.
      players = allSquadPlayers.filter((p) => p.nationality === homeNationality);

      const coachStaff = staffResp.staff.filter((s) => s.role !== 'scout');
      assignedCoaches = coachStaff.map((s) => {
        const mc = marketData.coaches.find((c) => c.id === s.id);
        return mc ? marketCoachToCoach(mc, weekNumber) : apiStaffToCoach(s, weekNumber);
      });

      const scoutStaff = staffResp.staff.filter((s) => s.role === 'scout');
      assignedScouts = scoutStaff.map((s) => {
        const ms = marketData.scouts.find((sc) => sc.id === s.id);
        return ms ? marketScoutToScout(ms, weekNumber, gameDate) : apiStaffToScout(s, weekNumber);
      });

      console.log(`[useAuthFlow] Tier 1: ${players.length}p / ${assignedCoaches.length}c / ${assignedScouts.length}s from backend`);
    } catch (err) {
      console.warn('[useAuthFlow] Squad/staff fetch failed:', err);
    }

    // Tier 2: backend returned empty — pull directly from market pool (home nationality only)
    if (players.length === 0 && marketData.players.length > 0) {
      console.warn('[useAuthFlow] Tier 2: backend squad empty — picking from market pool');
      const homePool = marketData.players.filter((p) => p.nationality === homeNationality);
      const pool = homePool.length >= STARTER_PLAYER_COUNT ? homePool : marketData.players;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      players = shuffled
        .slice(0, STARTER_PLAYER_COUNT)
        .map((mp) => marketPlayerToPlayer(mp, weekNumber, gameDate));
    }
    if (assignedCoaches.length === 0 && marketData.coaches.length > 0) {
      assignedCoaches = [marketCoachToCoach(pickRandom(marketData.coaches), weekNumber)];
    }
    if (assignedScouts.length === 0 && marketData.scouts.length > 0) {
      assignedScouts = [marketScoutToScout(pickRandom(marketData.scouts), weekNumber, gameDate)];
    }

    // Tier 3: fully offline — generate locally (force home nationality)
    if (players.length === 0) {
      console.warn('[useAuthFlow] Tier 3: generating players locally (offline)');
      players = STARTER_POSITIONS.map((pos) => {
        const player = generatePlayer(pos, gameDate);
        const agentId = marketData.agents.length > 0 ? pickRandom(marketData.agents).id : null;
        return { ...player, nationality: homeNationality, agentId, enrollmentEndWeek: weekNumber + 52, morale: 40, extensionCount: 0 };
      });
    }
    if (assignedCoaches.length === 0) {
      assignedCoaches = [generateCoachProspect(weekNumber)];
    }
    if (assignedScouts.length === 0) {
      assignedScouts = [generateLocalScout(weekNumber)];
    }

    setPlayers(players);
    for (const coach of assignedCoaches) { addCoach(coach); }
    for (const scout of assignedScouts) { addScout(scout); }

    // Purge assigned entities from the market store — the market snapshot was
    // fetched (step 2) before the backend assigned them (step 3), so they would
    // otherwise appear as available in the market UI.
    for (const player of players) { removeFromMarket('player', player.id); }
    for (const coach of assignedCoaches) { removeFromMarket('coach', coach.id); }
    for (const scout of assignedScouts) { removeFromMarket('scout', scout.id); }

    // 7. Apply sponsor/investor assignments
    setSponsorIds(sponsorIds);
    setInvestorId(investorId);

    // 8. Finalise
    setAcademyName(academyName);
    setCountry(country);
    setShowWelcomeSplash(true);
    setIsOnboarding(false);
  }

  return {
    isReady,
    isOnboarding,
    registerAcademy,
    showWelcomeSplash,
    dismissWelcomeSplash: () => setShowWelcomeSplash(false),
  };
}
