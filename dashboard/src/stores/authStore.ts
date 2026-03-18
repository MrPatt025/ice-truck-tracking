/**
 * RBAC Auth Store — Zustand store for authentication state,
 * user roles, and permission-based access control.
 * Zero-render: selectors only subscribe to needed slices.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserRole } from '@/lib/tokens';

// ── Types ──────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  company?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
}

// ── Permission Matrix ──────────────────────────────────────
const permissionMatrix: Record<UserRole, string[]> = {
  admin: [
    'dashboard:view', 'dashboard:edit',
    'fleet:view', 'fleet:edit', 'fleet:delete',
    'reports:view', 'reports:export',
    'alerts:view', 'alerts:create', 'alerts:delete',
    'settings:view', 'settings:edit',
    'users:view', 'users:edit', 'users:delete',
    'api:manage',
  ],
  'fleet-manager': [
    'dashboard:view', 'dashboard:edit',
    'fleet:view', 'fleet:edit',
    'reports:view', 'reports:export',
    'alerts:view', 'alerts:create',
    'settings:view',
  ],
  operator: [
    'dashboard:view',
    'fleet:view',
    'reports:view',
    'alerts:view',
    'settings:view',
  ],
  viewer: [
    'dashboard:view',
    'fleet:view',
    'reports:view',
  ],
};

// ── API Base URL ───────────────────────────────────────────
const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${API_ROOT
  .replace(/\/+$/, '')
  .replace(/\/api(?:\/v1)?$/i, '')}/api/v1`;

// ── Store ──────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const username = email.includes('@') ? email.split('@')[0] : email;
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password }),
            credentials: 'include',
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({ message: 'Login failed' }));
            set({ error: data.message || 'Invalid credentials', isLoading: false });
            return false;
          }

          const data = await res.json();
          const user: User = {
            id: data.user?.id || data.id,
            email: data.user?.email || email,
            name: data.user?.name || data.user?.username || email.split('@')[0],
            role: data.user?.role || 'viewer',
            avatar: data.user?.avatar,
            lastLogin: new Date().toISOString(),
          };

          // Set cookie for middleware auth check
          if (typeof document !== 'undefined') {
            document.cookie = `access_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }

          set({ user, token: data.token, isAuthenticated: true, isLoading: false, error: null });
          return true;
        } catch {
          set({ error: 'Network error. Please try again.', isLoading: false });
          return false;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
          });

          if (!res.ok) {
            const resData = await res.json().catch(() => ({ message: 'Registration failed' }));
            set({ error: resData.message || 'Registration failed', isLoading: false });
            return false;
          }

          set({ isLoading: false, error: null });
          return true;
        } catch {
          set({ error: 'Network error. Please try again.', isLoading: false });
          return false;
        }
      },

      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'access_token=; path=/; max-age=0';
        }
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({ message: 'Request failed' }));
            set({ error: data.message || 'Failed to send reset email', isLoading: false });
            return false;
          }

          set({ isLoading: false });
          return true;
        } catch {
          set({ error: 'Network error. Please try again.', isLoading: false });
          return false;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({ message: 'Reset failed' }));
            set({ error: data.message || 'Password reset failed', isLoading: false });
            return false;
          }

          set({ isLoading: false });
          return true;
        } catch {
          set({ error: 'Network error. Please try again.', isLoading: false });
          return false;
        }
      },

      updateProfile: async (profileData: Partial<User>) => {
        const { token } = get();
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({ message: 'Update failed' }));
            set({ error: data.message || 'Profile update failed', isLoading: false });
            return false;
          }

          const { user } = get();
          if (user) {
            set({ user: { ...user, ...profileData }, isLoading: false });
          }
          return true;
        } catch {
          set({ error: 'Network error. Please try again.', isLoading: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'ice-truck-auth',
      storage: createJSONStorage(() => {
        if (globalThis.window !== undefined) return localStorage;
        // SSR fallback: noop storage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ── Permission Helpers ─────────────────────────────────────
export function hasPermission(role: UserRole | undefined, permission: string): boolean {
  if (!role) return false;
  return permissionMatrix[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole | undefined, permissions: string[]): boolean {
  if (!role) return false;
  return permissions.some(p => permissionMatrix[role]?.includes(p));
}

export function getPermissions(role: UserRole): string[] {
  return permissionMatrix[role] || [];
}

// ── Route Access Matrix ────────────────────────────────────
const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard:view',
  '/fleet': 'fleet:view',
  '/reports': 'reports:view',
  '/alerts': 'alerts:view',
  '/settings': 'settings:view',
  '/admin': 'users:view',
};

export function canAccessRoute(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;
  // Find the most specific matching route
  const matchedRoute = Object.keys(routePermissions)
    .filter(route => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedRoute) return true; // Public routes
  return hasPermission(role, routePermissions[matchedRoute]);
}
