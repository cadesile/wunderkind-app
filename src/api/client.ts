import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { ApiError, LoginResponse } from '@/types/api';

/**
 * Resolves the API base URL (priority order):
 *
 * 1. EXPO_PUBLIC_API_BASE_URL env var — set by eas.json build profiles for all
 *    EAS builds (dev/staging/production). Also set in .env for local web dev
 *    (pointing at Lando). Leave unset in .env for native Expo Go dev.
 *
 * 2. Native Expo Go dev — Metro sets hostUri at runtime to the bundler's LAN
 *    address, e.g. "192.168.1.10:8081" → "http://192.168.1.10:8080".
 *    Requires: npm run proxy  (bridges :8080 → 127.0.0.1:52100)
 *
 * 3. Fallback → production URL
 */
function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // Native Expo Go dev — derive the correct LAN IP from Metro's hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080`;
  }

  return 'https://api.buildmyclub.co.uk';
}

const BASE_URL = resolveBaseUrl();

const REQUEST_TIMEOUT_MS = 10_000;

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshAuthToken(): Promise<void> {
  const { email, password, setToken } = useAuthStore.getState();
  if (!email || !password) throw new ApiError(401, 'No credentials stored for refresh');

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });

  if (!res.ok) throw new ApiError(res.status, 'Token refresh failed');

  const data = (await res.json()) as LoginResponse;
  setToken(data.token);
}

// ─── Core request ─────────────────────────────────────────────────────────────

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const token = useAuthStore.getState().token;

  // Enforce a strict 10-second timeout so background syncs never hang indefinitely
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && !_isRetry) {
    await refreshAuthToken();
    return apiRequest<T>(path, options, true);
  }

  if (response.status === 403) {
    throw new ApiError(403, 'Forbidden — contact support');
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  return response.json() as Promise<T>;
}
