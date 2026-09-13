'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { api, clearCsrf } from './api';
import type { User } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sessionEnded: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionEnded, setSessionEnded] = useState(false);
  const generation = useRef(0);

  const endSession = useCallback(() => {
    generation.current += 1;
    clearCsrf();
    setUser(null);
    setStatus('anonymous');
    setSessionEnded(true);
    router.replace('/login');
  }, [router]);
  const logout = useCallback(async () => {
    await api.logout();
    endSession();
    setSessionEnded(false);
    const channel = new BroadcastChannel('clientops-session');
    channel.postMessage('logout');
    channel.close();
  }, [endSession]);

  const refreshUser = useCallback(async () => {
    const revision = ++generation.current;
    try {
      const currentUser = await api.me();
      if (revision !== generation.current) return;
      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      if (revision !== generation.current) return;
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    // Remove credentials left by the previous JWT implementation; never read or reuse them.
    window.localStorage.removeItem('clientops_token');
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const expired = () => {
      if (status === 'authenticated') endSession();
    };
    window.addEventListener('clientops:session-expired', expired);
    const channel = new BroadcastChannel('clientops-session');
    channel.onmessage = () => endSession();
    return () => {
      window.removeEventListener('clientops:session-expired', expired);
      channel.close();
    };
  }, [endSession, status]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    generation.current += 1;
    setUser(result.user);
    setStatus('authenticated');
    setSessionEnded(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      refreshUser,
      sessionEnded,
    }),
    [user, status, login, logout, refreshUser, sessionEnded],
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
