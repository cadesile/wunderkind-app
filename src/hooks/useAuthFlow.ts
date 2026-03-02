import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { register, login } from '@/api/endpoints/auth';

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
 * registerAcademy:
 *   auto-generates device credentials → register → login → store JWT →
 *   set academy name → generate starter squad → isOnboarding=false
 */
export function useAuthFlow(): AuthFlowResult {
  const { token, email, password, setToken, setCredentials, setUserId } =
    useAuthStore();
  const setAcademyName = useAcademyStore((s) => s.setName);
  const generateStarterSquad = useSquadStore((s) => s.generateStarterSquad);

  const [isReady, setIsReady] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    async function initialize() {
      // Case 1: valid token already stored — nothing to do
      if (token) {
        setIsReady(true);
        return;
      }

      // Case 2: credentials stored but token expired — re-login silently
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

      // Case 3: first launch — hand off to the onboarding screen
      setIsOnboarding(true);
      setIsReady(true);
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registerAcademy(academyName: string): Promise<void> {
    const userEmail = generateDeviceEmail();
    const userPassword = generateDevicePassword();

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

    setAcademyName(academyName);
    generateStarterSquad();
    setIsOnboarding(false);
  }

  return { isReady, isOnboarding, registerAcademy };
}
