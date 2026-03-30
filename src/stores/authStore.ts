import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  password: string | null; // auto-generated device credential — not user-entered
  userId: string | null;
  setToken: (token: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setCredentials: (email: string, password: string) => void;
  setUserId: (id: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      email: null,
      password: null,
      userId: null,
      setToken: (token) => set({ token }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setCredentials: (email, password) => set({ email, password }),
      setUserId: (userId) => set({ userId }),
      clearAuth: () => set({ token: null, refreshToken: null, email: null, password: null, userId: null }),
    }),
    { name: 'auth-store', storage: zustandStorage }
  )
);
