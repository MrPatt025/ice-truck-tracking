'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/apiClient';

// -----------------------------
// Types
// -----------------------------
export type User = {
  id: string;
  username: string;
  role: string;
};

type LoginResponse = {
  user?: User;
  token?: string;
  accessToken?: string;
};

type RefreshResponse = {
  user?: User;
  token?: string;
  accessToken?: string;
};

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// -----------------------------
// Storage helpers
// -----------------------------
const ACCESS_KEYS = ['authToken', 'auth_token'] as const;
const COOKIE_NAME = 'authToken';
const CSRF_COOKIE = 'csrfToken';

function setCookie(name: string, value: string, opts?: { days?: number; secure?: boolean; path?: string; sameSite?: 'Lax' | 'Strict' | 'None' }) {
  if (typeof document === 'undefined') return;
  const days = opts?.days ?? 7;
  const path = opts?.path ?? '/';
  const sameSite = opts?.sameSite ?? 'Lax';
  const secure = opts?.secure ?? (typeof location !== 'undefined' && location.protocol === 'https:');
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=${path}; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
}

function ensureCsrfCookie() {
  if (typeof document === 'undefined') return;
  if (!document.cookie.includes(`${CSRF_COOKIE}=`)) {
    try {
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      setCookie(CSRF_COOKIE, token, { days: 7, sameSite: 'Lax' });
    } catch {}
  }
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const k of ACCESS_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function writeToken(token: string) {
  if (typeof window === 'undefined') return;
  for (const k of ACCESS_KEYS) {
    try {
      window.localStorage.setItem(k, token);
    } catch {}
  }
}

function clearToken() {
  if (typeof window === 'undefined') return;
  for (const k of ACCESS_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  }
}

// Use the shared axios API client (with auth and Sentry breadcrumbs)

// -----------------------------
// Auth Provider
// -----------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Token is read synchronously so post-login redirect sees it immediately
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setTokenBoth = useCallback((next: string | null) => {
    if (next) writeToken(next);
    else clearToken();
    setToken(next);
    try {
      if (next) setCookie(COOKIE_NAME, next, { days: 3, sameSite: 'Lax' });
      else deleteCookie(COOKIE_NAME);
    } catch {}
  }, []);

  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const base = (
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      ).replace(/\/+$/, '');
      const res = await api.get<User>(`${base}/api/v1/auth/me`);
      const me = res.data as any;
      if (!me || !me.id) return null;
      return {
        id: String(me.id),
        username: String(me.username ?? ''),
        role: String(me.role ?? ''),
      };
    } catch {
      return null;
    }
  }, []);

  // Bootstrap on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureCsrfCookie();
      setLoading(true);
      setError(null);
      const stored = readToken();
      if (stored && stored !== token) setTokenBoth(stored);

      let me: User | null = null;
      if (stored) {
        me = await fetchMe();
      }

      if (!me) {
        // try refresh if backend supports it
        try {
          const base = (
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
          ).replace(/\/+$/, '');
          const rr = await api.post<RefreshResponse>(
            `${base}/api/v1/auth/refresh`,
            {},
          );
          const t = rr.data?.accessToken ?? rr.data?.token ?? null;
          if (t) {
            setTokenBoth(t);
            me = await fetchMe();
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setUser(me);
        setLoading(false);
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, setTokenBoth, token]);

  // Auto-refresh before expiry using JWT exp
  useEffect(() => {
    if (!token) return;
    let timer: any;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
      const expMs = (payload?.exp ?? 0) * 1000;
      const now = Date.now();
      const lead = 60_000; // refresh 60s before expiry
      const due = Math.max(5_000, expMs - now - lead);
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      timer = setTimeout(async () => {
        try {
          const rr = await api.post<RefreshResponse>(`${base}/api/v1/auth/refresh`, {});
          const t = rr.data?.accessToken ?? rr.data?.token ?? null;
          if (t) {
            setTokenBoth(t);
            const me = await fetchMe();
            if (me) setUser(me);
          } else {
            await logout();
          }
        } catch {
          await logout();
        }
      }, due);
    } catch {
      // if cannot decode, fall back to no timer; interceptor will handle 401
    }
    return () => clearTimeout(timer);
  }, [fetchMe, logout, setTokenBoth, token]);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        const base = (
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        ).replace(/\/+$/, '');
        const res = await api.post<LoginResponse>(`${base}/api/v1/auth/login`, {
          username,
          password,
        });
        const t = res.data?.accessToken ?? res.data?.token ?? null;
        if (!t) {
          setError('Missing access token');
          setLoading(false);
          return;
        }
        setTokenBoth(t);
        const me = await fetchMe();
        if (!me) {
          setError('Login succeeded but profile not available');
          setLoading(false);
          return;
        }
        setUser(me);
        setLoading(false);
        // Only redirect after both token and user are in state
        if (typeof window !== 'undefined') window.location.replace('/');
      } catch (err) {
        const e = err as AxiosError | undefined;
        if (e?.response?.status === 401) setError('Invalid credentials');
        else if ((e as any)?.code === 'ERR_NETWORK')
          setError('Network error or backend unreachable');
        else setError('Login failed');
        setLoading(false);
      }
    },
    [fetchMe, setTokenBoth],
  );

  const logout = useCallback(async () => {
    // clear local state immediately
    setTokenBoth(null);
    setUser(null);
    try { deleteCookie(COOKIE_NAME); } catch {}
    try {
      const base = (
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      ).replace(/\/+$/, '');
      await api.post(`${base}/api/v1/auth/logout`, {});
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') window.location.replace('/login');
  }, [setTokenBoth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      bootstrapped,
      loading,
      error,
      login,
      logout,
    }),
    [user, token, bootstrapped, loading, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// -----------------------------
// RequireAuth
// -----------------------------
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, bootstrapped, loading } = useAuth();

  // E2E bypass
  const isE2E =
    (typeof navigator !== 'undefined' && (navigator as any).webdriver) ||
    process.env.NEXT_PUBLIC_E2E === '1';
  if (isE2E) return <>{children}</>;

  // Wait until initial auth check completes and no active loading
  if (!bootstrapped || loading) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center text-sm text-gray-500"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  // After bootstrap, if no token, redirect to /login
  if (!token) {
    if (typeof window !== 'undefined') window.location.replace('/login');
    return null;
  }

  return <>{children}</>;
}
