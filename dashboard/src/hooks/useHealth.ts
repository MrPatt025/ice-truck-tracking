// /dashboard/src/hooks/useHealth.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

export type HealthState = {
  apiHealthy: boolean | null;
  online: boolean | null;
  lastChecked: number | null;
  isPolling: boolean;
  error: unknown;
  recheck: () => void;
};

const ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const BASE_URL = ENV && ENV.length > 0 ? ENV : 'http://localhost:5000';

const HEALTH_URL = (() => {
  try {
    return new URL('/api/v1/health', BASE_URL).toString();
  } catch {
    return `${String(BASE_URL).replace(/\/$/, '')}/api/v1/health`;
  }
})();

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

// 1–60s, default 5s
const POLL_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_POLL_MS);
  const base = Number.isFinite(raw) && raw > 0 ? raw : 5000;
  return clamp(base, 1000, 60000);
})();

// per-request timeout 1–9s
const REQUEST_TIMEOUT_MS = clamp(POLL_MS - 100, 1000, 9000);

// fetcher supports { ok:true } or { status:"ok" }
const healthFetcher = async (url: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return false;

    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      try {
        const data = await res.json();
        if (typeof data?.ok === 'boolean') return data.ok;
        if (typeof data?.status === 'string') {
          const s = data.status.toLowerCase();
          if (s === 'ok' || s === 'healthy' || s === 'pass') return true;
          if (s === 'fail' || s === 'down') return false;
        }
      } catch {
        // fall through to HTTP ok
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const useHealth = (): HealthState => {
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const swrOptions = useMemo(
    () => ({
      refreshInterval: POLL_MS,
      dedupingInterval: POLL_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      isVisible: () =>
        typeof document === 'undefined' ? true : !document.hidden,
      isOnline: () =>
        typeof navigator === 'undefined' ? true : navigator.onLine,
    }),
    [],
  );

  const { data, error, isValidating, mutate } = useSWR<boolean>(
    HEALTH_URL,
    healthFetcher,
    swrOptions,
  );

  useEffect(() => {
    if (data !== undefined || error !== undefined) setLastChecked(Date.now());
  }, [data, error]);

  const apiHealthy = error ? false : (data ?? null);

  return {
    apiHealthy,
    online,
    lastChecked,
    isPolling: isValidating,
    error,
    recheck: () => {
      void mutate();
    },
  };
};
