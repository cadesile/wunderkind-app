import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { register, login } from '@/api/endpoints/auth';

function generateDeviceEmail(): string {
  const chars = 'abcdef0123456789';
  const id = Array.from({ length: 24 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `wk-${id}@device.wunderkind.app`;
}

function generateDevicePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 20 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Handles the full auth flow on app launch:
 * 1. If no token + no credentials → register → login → store token
 * 2. If credentials exist but no token → login → store token
 * 3. If token already present → ready immediately
 *
 * Returns `isReady` — false while initialising, true once the app can proceed.
 */
export function useAuthFlow() {
  const { token, email, password, setToken, setCredentials, setUserId } =
    useAuthStore();
  const [isReady, setIsReady] = useState(!!token);

  useEffect(() => {
    if (token) return; // already authenticated

    async function initialize() {
      try {
        let userEmail = email;
        let userPassword = password;

        if (!userEmail || !userPassword) {
          // First launch — generate device credentials and register
          userEmail = generateDeviceEmail();
          userPassword = generateDevicePassword();

          const registered = await register({
            email: userEmail,
            password: userPassword,
            academyName: 'Wunderkind Academy',
          });

          setCredentials(userEmail, userPassword);
          setUserId(registered.id);
        }

        // Exchange credentials for JWT
        const { token: newToken } = await login({
          username: userEmail,
          password: userPassword,
        });
        setToken(newToken);
      } catch (err) {
        // Non-fatal — app can still run offline; sync will retry when online
        console.warn('[useAuthFlow] Auth init failed:', err);
      } finally {
        setIsReady(true);
      }
    }

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isReady };
}
