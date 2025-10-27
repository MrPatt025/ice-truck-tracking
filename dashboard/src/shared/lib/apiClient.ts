import axios, { type AxiosRequestConfig } from 'axios';

// Lazy, client-only Sentry breadcrumb helper to avoid server build warnings
function addBreadcrumbSafe(breadcrumb: {
  category?: string;
  type?: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;
  // Fire-and-forget dynamic import; do not block requests
  import('@sentry/browser')
    .then((m) => {
      try {
        m.addBreadcrumb?.(breadcrumb as any);
      } catch {}
    })
    .catch(() => {});
}

declare module 'axios' {
  interface AxiosRequestConfig {
    __retried?: boolean;
  }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token =
    typeof window !== 'undefined'
      ? (localStorage.getItem('authToken') ??
        localStorage.getItem('auth_token'))
      : null;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  // Add breadcrumb for outgoing request (PII-safe)
  try {
    const url = cfg.baseURL
      ? `${String(cfg.baseURL).replace(/\/+$/, '')}${cfg.url ?? ''}`
      : String(cfg.url ?? '');
    addBreadcrumbSafe({
      category: 'http',
      type: 'http',
      level: 'info',
      data: {
        method: String(cfg.method ?? 'get').toUpperCase(),
        url,
      },
    });
  } catch {}
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => {
    try {
      const url = r.config?.baseURL
        ? `${String(r.config.baseURL).replace(/\/+$/, '')}${r.config.url ?? ''}`
        : String(r.config?.url ?? '');
      addBreadcrumbSafe({
        category: 'http',
        type: 'http',
        level: r.status >= 400 ? 'warning' : 'info',
        data: {
          method: String(r.config?.method ?? 'get').toUpperCase(),
          url,
          status: r.status,
        },
      });
    } catch {}
    return r;
  },
  async (err) => {
    try {
      const cfg = err?.config as AxiosRequestConfig | undefined;
      const url = cfg?.baseURL
        ? `${String(cfg.baseURL).replace(/\/+$/, '')}${cfg.url ?? ''}`
        : String(cfg?.url ?? '');
      addBreadcrumbSafe({
        category: 'http',
        type: 'http',
        level: 'error',
        data: {
          method: String(cfg?.method ?? 'get').toUpperCase(),
          url,
          status: err?.response?.status,
        },
      });
    } catch {}
    const status = err?.response?.status;
    const config: AxiosRequestConfig | undefined = err?.config;
    // Only handle refresh in the browser where sessionStorage and redirect exist
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser && status === 401 && config && !config.__retried) {
      config.__retried = true;
      const base = (
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
      ).replace(/\/+$/, '');
      const refreshUrl = `${base}/api/v1/auth/refresh`;
      const bearer =
        localStorage.getItem('authToken') ?? localStorage.getItem('auth_token');
      const init: RequestInit = { method: 'POST', credentials: 'include' };
      if (bearer) init.headers = { Authorization: `Bearer ${bearer}` };
      refreshing ??= fetch(refreshUrl, init)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const token = j?.accessToken ?? j?.token ?? null;
          if (token) {
            try {
              localStorage.setItem('authToken', token);
            } catch {}
            try {
              localStorage.setItem('auth_token', token);
            } catch {}
          }
          return token as string | null;
        })
        .finally(() => {
          refreshing = null;
        });

      const token = await refreshing;
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization =
          `Bearer ${token}`;
        return api.request(config);
      }

      // refresh failed: force logout and redirect
      try {
        localStorage.removeItem('authToken');
      } catch {}
      try {
        localStorage.removeItem('auth_token');
      } catch {}
      try {
        // Best-effort logout call; ignore result
        const logoutUrl = `${base}/api/v1/auth/logout`;
        void fetch(logoutUrl, { method: 'POST', credentials: 'include' });
      } catch {}
      try {
        window.location.assign('/login');
      } catch {}
    }
    return Promise.reject(err);
  },
);
