import { useAuthStore } from '@/stores/authStore';
import { ApiError, LoginResponse } from '@/types/api';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://wunderkind-backend.lndo.site';

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
