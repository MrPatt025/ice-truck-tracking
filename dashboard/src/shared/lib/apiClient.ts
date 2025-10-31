import axios, { type AxiosRequestConfig } from 'axios';
import { getApiBase } from '@/shared/lib/apiBase';

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
  // Single authoritative base that already includes /api/v1
  baseURL: getApiBase(),
  // Always send/receive cookies (HttpOnly) for auth
  withCredentials: true,
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const pair = document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='));
  if (!pair) return null;
  const value = pair.split('=')[1] ?? '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

api.interceptors.request.use((cfg) => {
  // Normalize URL so leading slashes don't strip baseURL pathname (/api/v1)
  try {
    if (typeof cfg.url === 'string' && cfg.url.startsWith('/')) {
      // Remove leading slash to preserve base path joining behavior
      cfg.url = cfg.url.slice(1); // "/auth/login" -> "auth/login"
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[api] normalized leading "/" in request path to keep base path:',
          cfg.url,
        );
      }
    }
    // Optional safety net: warn if baseURL seems unversioned while path isn't a known segment
    if (process.env.NODE_ENV !== 'production') {
      const base = String(cfg.baseURL ?? '');
      const path = String(cfg.url ?? '').replace(/^\/+/, '');
      const known =
        /^(auth\/|trucks\b|alerts\b|stats\b|telemetry\b|docs\b)/i.test(path);
      if (base && !base.includes('/api/v') && !known) {
        console.warn(
          '[api] baseURL does not include "/api/v*" and path is not a known auth/resource segment. Check configuration:',
          { baseURL: base, path },
        );
      }
    }
  } catch {}

  // Do NOT attach Authorization header; rely on HttpOnly cookies managed by backend
  // Attach CSRF token only for mutating requests and skip auth endpoints
  try {
    const method = String(cfg.method ?? 'get').toLowerCase();
    const urlStr = String(cfg.url ?? '').toLowerCase();
    const isAuthPath = /^(auth\/(login|logout|refresh|me))\b/.test(urlStr);
    if (isAuthPath) {
      // Ensure any CSRF header is removed for auth endpoints
      if (cfg.headers) {
        delete (cfg.headers as Record<string, unknown>)['X-CSRF-Token'];
        delete (cfg.headers as Record<string, unknown>)['x-csrf-token'];
      }
    } else if (
      method === 'post' ||
      method === 'put' ||
      method === 'patch' ||
      method === 'delete'
    ) {
      const csrf = getCookie('csrfToken');
      if (csrf) {
        cfg.headers = cfg.headers ?? {};
        (cfg.headers as Record<string, string>)['X-CSRF-Token'] = csrf;
      }
    }
  } catch {}
  // Add breadcrumb for outgoing request (PII-safe)
  try {
    const url = cfg.baseURL
      ? `${String(cfg.baseURL).replace(/\/+$/, '')}${String(cfg.url ?? '').startsWith('/') ? '' : '/'}${cfg.url ?? ''}`
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

let isRefreshing = false;

api.interceptors.response.use(
  (r) => {
    try {
      const url = r.config?.baseURL
        ? `${String(r.config.baseURL).replace(/\/+$/, '')}${String(r.config.url ?? '').startsWith('/') ? '' : '/'}${r.config.url ?? ''}`
        : String(r.config?.url ?? '');
      // Extract request-id on success too for correlation in breadcrumbs
      const hdrName = String(
        process.env.NEXT_PUBLIC_REQUEST_ID_HEADER ?? 'x-request-id',
      ).toLowerCase();
      const reqId = (r.headers as any)?.[hdrName] ?? undefined;
      addBreadcrumbSafe({
        category: 'http',
        type: 'http',
        level: r.status >= 400 ? 'warning' : 'info',
        data: {
          method: String(r.config?.method ?? 'get').toUpperCase(),
          url,
          status: r.status,
          request_id: reqId,
        },
      });
      try {
        if (typeof window !== 'undefined' && reqId) {
          // Store last seen request-id for quick UI surfacing in generic errors
          (window as any).__lastRequestId = String(reqId);
        }
      } catch {}
    } catch {}
    return r;
  },
  async (err) => {
    try {
      const cfg = err?.config as AxiosRequestConfig | undefined;
      const url = cfg?.baseURL
        ? `${String(cfg.baseURL).replace(/\/+$/, '')}${String(cfg.url ?? '').startsWith('/') ? '' : '/'}${cfg.url ?? ''}`
        : String(cfg?.url ?? '');
      const hdrName = String(
        process.env.NEXT_PUBLIC_REQUEST_ID_HEADER ?? 'x-request-id',
      ).toLowerCase();
      const reqId: string | undefined = (err?.response?.headers ?? {})[hdrName];
      // Attach request-id onto the error for downstream handlers (UI/tooltips)
      try {
        Object.defineProperty(err, '__requestId', {
          value: reqId,
          enumerable: true,
          configurable: true,
        });
      } catch {}
      try {
        if (typeof window !== 'undefined' && reqId) {
          (window as any).__lastRequestId = String(reqId);
        }
      } catch {}
      addBreadcrumbSafe({
        category: 'http',
        type: 'http',
        level: 'error',
        data: {
          method: String(cfg?.method ?? 'get').toUpperCase(),
          url,
          status: err?.response?.status,
          request_id: reqId,
        },
      });
      // Tag the current Sentry scope with request-id (prod only)
      if (
        typeof window !== 'undefined' &&
        process.env.NODE_ENV === 'production' &&
        reqId
      ) {
        try {
          const Sentry = await import('@sentry/browser');
          const configure =
            (Sentry as any).default?.configureScope ??
            (Sentry as any).configureScope;
          configure?.((scope: any) => {
            try {
              scope.setTag?.('request_id', String(reqId));
            } catch {}
          });
        } catch {}
      }
    } catch {}
    const status = err?.response?.status;
    const config: AxiosRequestConfig | undefined = err?.config;
    // Handle refresh in the browser
    if (
      typeof window !== 'undefined' &&
      status === 401 &&
      config &&
      !config.__retried
    ) {
      if (isRefreshing) {
        // Another request is already handling refresh; do not storm
        return Promise.reject(err);
      }
      config.__retried = true;
      isRefreshing = true;
      try {
        await api.post('auth/refresh'); // NO leading slash
        isRefreshing = false;
        return api.request(config);
      } catch (refreshErr) {
        isRefreshing = false;
        try {
          // best-effort logout
          await api.post('auth/logout');
        } catch {}
        try {
          window.location.href = '/login';
        } catch {}
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(err);
  },
);

// Minimal same-origin JSON fetch helper for simple use-cases
// Keeps requests relative (proxied in dev) and includes cookies by default
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('/api')
    ? path
    : `/api${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    } as Record<string, string>,
    ...init,
  });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  // Best-effort: attempt JSON; fall back to text
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
