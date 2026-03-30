import { apiRequest } from '@/api/client';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from '@/types/api';

export function register(body: RegisterRequest): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function refreshTokenRequest(body: TokenRefreshRequest): Promise<TokenRefreshResponse> {
  return apiRequest<TokenRefreshResponse>('/api/token/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
