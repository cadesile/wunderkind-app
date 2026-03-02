import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useMarketStore } from '@/stores/marketStore';
import { register, login } from '@/api/endpoints/auth';
import { fetchMarketData } from '@/api/endpoints/marketData';
import { generatePlayer } from '@/engine/personality';
import { generateCoachProspect, generateScout } from '@/engine/recruitment';
import { getGameDate } from '@/utils/gameDate';

const POSITIONS = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD',
                   'GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'FWD'] as const;

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
 * 1. Token present → ready immediately, no onboarding.
 * 2. Credentials present (token expired) → silent re-login → ready.
 * 3. First launch (no credentials) → isOnboarding=true; call
 *    registerAcademy(name) from the onboarding screen to complete setup.
 *
 * registerAcademy bootstrap sequence:
 *   1. register() → login() → store JWT
 *   2. fetchMarketData() → marketStore.setMarketData()
 *   3. academyStore.setCreatedAt(), addBalance(50_000), facilityStore.initAllLevels()
 *   4. Generate 20 players with agent assignments → squadStore.setPlayers()
 *   5. Generate 2 coaches → coachStore.addCoach()
 *   6. Generate 2 scouts → scoutStore.addScout()
 *   7. Assign 3 SMALL sponsors, 1 investor from market data
 *   8. setAcademyName(), setIsOnboarding(false)
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
  const { setMarketData } = useMarketStore();

  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    async function initialize() {
      if (token) {
        setIsReady(true);
        return;
      }

      if (email && password) {
        try {
          const { token: newToken } = await login({ username: email, password });
          setToken(newToken);
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

    // 2. Fetch market data (non-blocking on failure — game still works offline)
    let marketData = { agents: [], scouts: [], investors: [], sponsors: [] };
    try {
      marketData = await fetchMarketData();
      setMarketData(marketData);
    } catch (err) {
      console.warn('[useAuthFlow] Market data fetch failed — continuing offline:', err);
    }

    // 3. Academy setup
    setCreatedAt(new Date().toISOString());
    addBalance(50_000);
    initAllLevels();

    // 4. Generate 20 players with agent IDs
    const weekNumber = 1;
    const gameDate = getGameDate(weekNumber);
    const players = POSITIONS.map((pos) => {
      const player = generatePlayer(pos, gameDate);
      const agentId =
        marketData.agents.length > 0
          ? pickRandom(marketData.agents).id
          : null;
      return { ...player, agentId };
    });
    setPlayers(players);

    // 5. Generate 2 coaches
    for (let i = 0; i < 2; i++) {
      addCoach(generateCoachProspect(weekNumber));
    }

    // 6. Generate 2 scouts
    for (let i = 0; i < 2; i++) {
      addScout(generateScout(weekNumber));
    }

    // 7. Assign 3 SMALL sponsors and 1 investor from market data
    const smallSponsors = marketData.sponsors.filter((s) => s.companySize === 'SMALL');
    const sponsorIds = smallSponsors.slice(0, 3).map((s) => s.id);
    setSponsorIds(sponsorIds);

    if (marketData.investors.length > 0) {
      setInvestorId(pickRandom(marketData.investors).id);
    }

    // 8. Finalise
    setAcademyName(academyName);
    setIsOnboarding(false);
  }

  return { isReady, isOnboarding, registerAcademy };
}
