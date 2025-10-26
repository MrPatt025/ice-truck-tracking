// dashboard/src/lib/api.ts

export const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
).replace(/\/+$/, '');
export const WS_URL = (
  process.env.NEXT_PUBLIC_WS_URL ?? BASE_URL.replace(/^http/, 'ws')
).replace(/\/+$/, '');

export type Truck = {
  id: string;
  latitude: number;
  longitude: number;
  driver_name: string;
  speed: number;
  temp: number;
  updatedAt: string;
};

export type AlertItem = {
  id: string | number;
  level: 'info' | 'warn' | 'critical';
  message: string;
  ts: string;
};

export type HealthResponse = {
  status: string;
  timestamp?: string;
  uptime?: number;
  version?: string;
  websocket_clients?: number;
};

type ReqInit = RequestInit & { timeoutMs?: number };

async function request<T>(path: string, init: ReqInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 10_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      next: { revalidate: 0 },
      credentials: 'include',
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const isJson = res.headers
      .get('content-type')
      ?.includes('application/json');
    if (!res.ok) {
      const body = isJson
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => '');
      const details = typeof body === 'string' ? body : JSON.stringify(body);
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${details ? ` - ${details}` : ''}`,
      );
    }

    return (isJson ? res.json() : (undefined as unknown)) as T;
  } finally {
    clearTimeout(t);
  }
}

export const getTrucks = (init?: ReqInit) =>
  request<Truck[]>('/api/v1/trucks', init);
export const getAlerts = (init?: ReqInit) =>
  request<AlertItem[]>('/api/v1/alerts', init);
export const getHealth = (init?: ReqInit) =>
  request<HealthResponse>('/api/v1/health', init);
