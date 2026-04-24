import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { ApiError, LoginResponse, TokenRefreshResponse } from '@/types/api';
import { useDebugLogStore } from '@/stores/debugLogStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';

/**
 * Resolves the API base URL (priority order):
 *
 * 1. Browser (web) — always hits Lando directly; no proxy needed.
 *
 * 2. EXPO_PUBLIC_API_BASE_URL env var — used by EAS build profiles to
 *    point at staging/production. Leave unset in .env for native Expo Go dev.
 *
 * 3. Native Expo Go dev — falls straight through to the production URL.
 *    The proxy is no longer needed for day-to-day device testing.
 *
 * 4. Fallback → production URL
 */
function resolveBaseUrl(): string {
  // Web/browser dev always targets Lando directly
  if (Platform.OS === 'web') {
    return 'http://wunderkind-backend.lndo.site';
  }

  // EAS build profiles (or manual override in .env)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // Native — use production
  return 'https://api.buildmyclub.co.uk';
}

const BASE_URL = resolveBaseUrl();

// Log the resolved API base URL once at startup so it's visible in Metro logs
console.log(`[API] Base URL: ${BASE_URL} (hostUri=${Constants.expoConfig?.hostUri ?? 'none'}, env=${process.env.EXPO_PUBLIC_API_BASE_URL ?? 'unset'})`);

const REQUEST_TIMEOUT_MS = 10_000;

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshAuthToken(): Promise<void> {
  const { refreshToken, email, password, setTokens, setToken } = useAuthStore.getState();

  // Step 1: try the dedicated refresh-token endpoint (up to 30-day offline support)
  if (refreshToken) {
    const res = await fetch(`${BASE_URL}/api/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (res.ok) {
      const data = (await res.json()) as TokenRefreshResponse;
      setTokens(data.token, data.refresh_token);
      return;
    }
    // Non-2xx means the refresh token itself has expired — fall through to re-login
  }

  // Step 2: fall back to full re-login with stored device credentials
  if (!email || !password) throw new ApiError(401, 'No credentials stored for re-authentication');

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });

  if (!res.ok) throw new ApiError(res.status, 'Re-authentication failed');

  const data = (await res.json()) as LoginResponse;
  if (data.refresh_token) {
    setTokens(data.token, data.refresh_token);
  } else {
    setToken(data.token);
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────

function isDebugEnabled(): boolean {
  return useGameConfigStore.getState().config.debugLoggingEnabled === true;
}

function logId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const token = useAuthStore.getState().token;
  const method = (options.method ?? 'GET').toUpperCase();
  const debug = isDebugEnabled() && !_isRetry; // only log the first attempt

  let requestBody: unknown;
  if (debug && options.body) {
    try { requestBody = JSON.parse(options.body as string); } catch { requestBody = options.body; }
  }

  const startMs = Date.now();

  if (debug) {
    useDebugLogStore.getState().addEntry({
      id: logId(),
      timestamp: new Date().toISOString(),
      level: 'request',
      method,
      path,
      requestBody,
    });
  }

  // Enforce a timeout so background syncs never hang indefinitely
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    return apiRequest<T>(path, options, true, timeoutMs);
  }

  if (response.status === 403) {
    if (debug) {
      useDebugLogStore.getState().addEntry({
        id: logId(),
        timestamp: new Date().toISOString(),
        level: 'response_error',
        method,
        path,
        statusCode: 403,
        durationMs: Date.now() - startMs,
        errorMessage: 'Forbidden — contact support',
      });
    }
    throw new ApiError(403, 'Forbidden — contact support');
  }

  if (!response.ok) {
    if (debug) {
      useDebugLogStore.getState().addEntry({
        id: logId(),
        timestamp: new Date().toISOString(),
        level: 'response_error',
        method,
        path,
        statusCode: response.status,
        durationMs: Date.now() - startMs,
        errorMessage: response.statusText,
      });
    }
    throw new ApiError(response.status, response.statusText);
  }

  const data = await response.json() as T;

  if (debug) {
    useDebugLogStore.getState().addEntry({
      id: logId(),
      timestamp: new Date().toISOString(),
      level: 'response_ok',
      method,
      path,
      statusCode: response.status,
      durationMs: Date.now() - startMs,
      responseBody: data,
    });
  }

  return data;
}

/** Log an app-level error to the debug store (no-op when debug is off). */
export function logAppError(message: string, detail?: unknown): void {
  if (!isDebugEnabled()) return;
  useDebugLogStore.getState().addEntry({
    id: logId(),
    timestamp: new Date().toISOString(),
    level: 'app_error',
    path: '(app)',
    errorMessage: message,
    responseBody: detail,
  });
}
