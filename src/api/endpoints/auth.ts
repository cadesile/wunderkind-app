import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/api';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://wunderkind-backend.lndo.site';

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export function register(body: RegisterRequest): Promise<RegisterResponse> {
  return publicPost<RegisterResponse>('/api/register', body);
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return publicPost<LoginResponse>('/api/login', body);
}
