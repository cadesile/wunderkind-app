import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useMarketStore } from '@/stores/marketStore';
import { register, login } from '@/api/endpoints/auth';
import { marketApi } from '@/api/endpoints/market';
import { generatePlayer } from '@/engine/personality';
import { generateCoachProspect, generateScout } from '@/engine/recruitment';
import { getGameDate } from '@/utils/gameDate';

const POSITIONS = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'GK', 'DEF'] as const;

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

export interface AuthFlowResult {
  isReady: boolean;
  isOnboarding: boolean;
  registerAcademy: (academyName: string) => Promise<void>;
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
 *   2. fetchMarketData() → marketStore (for agents, sponsors, investors pool)
 *   3. initializeAcademy() → backend-confirmed sponsor/investor IDs (with local fallback)
 *   4. setCreatedAt(), addBalance(startingBalance), facilityStore.initAllLevels()
 *   5. Generate 20 players with agent assignments → squadStore.setPlayers()
 *   6. Generate 2 coaches → coachStore.addCoach()
 *   7. Generate 2 scouts → scoutStore.addScout()
 *   8. setSponsorIds(), setInvestorId()
 *   9. setAcademyName(), setIsOnboarding(false)
 */
export function useAuthFlow(): AuthFlowResult {
  const { token, email, password, setToken, setCredentials, setUserId } =
    useAuthStore();
  const { setName: setAcademyName, addBalance, setCreatedAt, setSponsorIds, setInvestorId } =
    useAcademyStore();
  const { setPlayers } = useSquadStore();
  const { addCoach } = useCoachStore();
  const { addScout } = useScoutStore();
  const { initAllLevels } = useFacilityStore();
  const { setMarketData, fetchMarketData } = useMarketStore();

  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    async function initialize() {
      if (token) {
        setIsReady(true);
        // Refresh market data in background — respects 5-min cache, safe to fire & forget
        void fetchMarketData();
        return;
      }

      if (email && password) {
        try {
          const { token: newToken } = await login({ username: email, password });
          setToken(newToken);
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

  async function registerAcademy(academyName: string): Promise<void> {
    const userEmail = generateDeviceEmail();
    const userPassword = generateDevicePassword();

    // 1. Auth
    const registered = await register({
      email: userEmail,
      password: userPassword,
      academyName,
    });

    setCredentials(userEmail, userPassword);
    setUserId(registered.id);

    const { token: newToken } = await login({
      username: userEmail,
      password: userPassword,
    });
    setToken(newToken);

    // 2. Fetch market data — populates agent/sponsor/investor pools for assignment
    let marketData = { players: [], coaches: [], scouts: [], agents: [], investors: [], sponsors: [] };
    try {
      const fetched = await marketApi.getMarketData();
      marketData = fetched;
      setMarketData(fetched);
    } catch (err) {
      console.warn('[useAuthFlow] Market data fetch failed — continuing offline:', err);
    }

    // 3. Register academy server-side — response contains metadata only, no financial data.
    //    Starting balance and sponsor/investor IDs are always derived locally.
    try {
      await marketApi.initializeAcademy(academyName);
    } catch (err) {
      console.warn('[useAuthFlow] Academy init failed — continuing offline:', err);
    }

    const startingBalance = 50_000;
    // Starter bundle spec: 1 small sponsor, 0 investors at creation.
    // An investor offer arrives in the inbox after the first week.
    const smallSponsors = marketData.sponsors.filter((s) => s.companySize === 'SMALL');
    const sponsorIds = smallSponsors.slice(0, 1).map((s) => s.id);
    const investorId = null;

    // 4. Academy setup
    setCreatedAt(new Date().toISOString());
    addBalance(startingBalance);
    initAllLevels();

    // 5. Generate 10 players with agent IDs from market pool
    const weekNumber = 1;
    const gameDate = getGameDate(weekNumber);
    const players = POSITIONS.map((pos) => {
      const player = generatePlayer(pos, gameDate);
      const agentId = marketData.agents.length > 0 ? pickRandom(marketData.agents).id : null;
      return {
        ...player,
        agentId,
        enrollmentEndWeek: weekNumber + 52,
        morale: 70,
        extensionCount: 0,
      };
    });
    setPlayers(players);

    // 6. Generate 2 coaches
    for (let i = 0; i < 2; i++) {
      addCoach(generateCoachProspect(weekNumber));
    }

    // 7. Generate 1 scout (spec: starter bundle includes 1 scout)
    addScout(generateScout(weekNumber));

    // 8. Apply sponsor/investor assignments
    setSponsorIds(sponsorIds);
    setInvestorId(investorId);

    // 9. Finalise
    setAcademyName(academyName);
    setIsOnboarding(false);
  }

  return { isReady, isOnboarding, registerAcademy };
}
