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
  token: string | null; // cookie-based; set to non-null sentinel when authenticated
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; status?: number; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// -----------------------------
// CSRF helper (non-HttpOnly)
// -----------------------------
const CSRF_COOKIE = 'csrfToken';
function ensureCsrfCookie() {
  if (typeof document === 'undefined') return;
  if (!document.cookie.includes(`${CSRF_COOKIE}=`)) {
    try {
      const token =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const days = 7;
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      const secure =
        typeof location !== 'undefined' && location.protocol === 'https:';
      document.cookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}; Expires=${expires}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
    } catch {}
  }
}

// Use the shared axios API client (with auth and Sentry breadcrumbs)

// -----------------------------
// Auth Provider
// -----------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Cookie-based session: token is an in-memory sentinel only (non-persistent)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setAuthenticated = useCallback((isAuthed: boolean) => {
    setToken(isAuthed ? 'cookie' : null);
  }, []);

  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      // NOTE: Use relative resource path without leading slash so axios preserves baseURL path (/api/v1)
      const res = await api.get<User>('auth/me');
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

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        await api.post<LoginResponse>('auth/login', { username, password });
        const me = await fetchMe();
        if (!me) {
          setError('Login succeeded but profile not available');
          setLoading(false);
          return { ok: false, message: 'Profile not available after login' };
        }
        setUser(me);
        setAuthenticated(true);
        setLoading(false);
        // redirect handled by caller (/login)
        return { ok: true } as const;
      } catch (err) {
        const e = err as AxiosError | undefined;
        if (e?.response) {
          const status = e.response.status;
          const msg = (e.response.data as any)?.message;
          if (status === 401) setError('Invalid credentials');
          else
            setError(
              `Login failed (${status}${msg ? `: ${String(msg)}` : ''})`,
            );
          return {
            ok: false,
            status,
            message: String(msg ?? 'Request failed'),
          };
        } else if ((e as any)?.code === 'ERR_NETWORK') {
          setError('Network error or backend unreachable');
          return { ok: false, message: 'Network error or backend unreachable' };
        } else {
          setError('Login failed');
          return { ok: false, message: 'Login failed' };
        }
        setLoading(false);
      }
    },
    [fetchMe, setAuthenticated],
  );

  const logout = useCallback(async () => {
    setAuthenticated(false);
    setUser(null);
    try {
      await api.post('auth/logout', {});
    } catch {}
    if (typeof window !== 'undefined') window.location.replace('/login');
  }, [setAuthenticated]);

  // Bootstrap on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureCsrfCookie();
      setLoading(true);
      setError(null);
      let me: User | null = null;
      try {
        // Try to refresh first to rehydrate session, then fetch profile
        await api.post<RefreshResponse>('auth/refresh', {});
      } catch {}
      try {
        me = await fetchMe();
      } catch {}
      if (!cancelled) {
        setUser(me);
        setAuthenticated(!!me);
        setLoading(false);
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, setAuthenticated]);
  // Auto-refresh via axios interceptor; no JWT parsing here

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
