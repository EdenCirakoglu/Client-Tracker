'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, clearStoredToken, getStoredToken, setStoredToken } from './api';
import type { User } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setStatus('anonymous');
      return;
    }

    try {
      const currentUser = await api.me();
      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      clearStoredToken();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    window.addEventListener('clientops:session-expired', logout);
    const syncSession = (event: StorageEvent) => {
      if (event.key === 'clientops_token') void refreshUser();
    };
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('clientops:session-expired', logout);
      window.removeEventListener('storage', syncSession);
    };
  }, [logout, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setStoredToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
