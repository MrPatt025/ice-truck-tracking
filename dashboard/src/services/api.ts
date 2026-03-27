/**
 * API Service — Centralized API client with auth, retry, and error handling.
 * Provides typed methods for all backend endpoints.
 */

import {
  dispatchBackendHealthEvent,
  type BackendHealthStatus,
} from '@/lib/healthEvents';

const API_BASE = (() => {
  const configuredApiRoot = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiRoot) {
    return `${configuredApiRoot
      .replace(/\/+$/, '')
      .replace(/\/api(?:\/v1)?$/i, '')}/api/v1`;
  }

  if (
    globalThis.window !== undefined
    && /^(localhost|127\.0\.0\.1)$/i.test(globalThis.window.location.hostname)
  ) {
    return '/api/v1';
  }

  return 'http://localhost:5000/api/v1';
})();

let latestBackendHealthStatus: BackendHealthStatus | null = null;

type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueuedMutation = Readonly<{
  id: string;
  endpoint: string;
  method: MutationMethod;
  body: string | null;
  headers: Readonly<Record<string, string>>;
  createdAt: number;
}>;

const OFFLINE_MUTATION_QUEUE_KEY = 'ice-truck:offline-mutation-queue:v1';
const OFFLINE_SYNC_TAG = 'ice-truck-fleet-sync';

let isQueueFlushRunning = false;
let onlineListenerAttached = false;

function canUseBrowserStorage(): boolean {
  return globalThis.window !== undefined;
}

function isMutationMethod(method: string): method is MutationMethod {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function shouldQueueOfflineMutation(endpoint: string, method: string): boolean {
  if (!isMutationMethod(method)) return false;
  if (!canUseBrowserStorage()) return false;

  const isTruckMutation = /^\/trucks(\/|$)/.test(endpoint);
  const isFeatureFlagMutation = /^\/feature-flags(\/|$)/.test(endpoint);

  return isTruckMutation || isFeatureFlagMutation;
}

function readQueuedMutations(): QueuedMutation[] {
  if (!canUseBrowserStorage()) return [];

  try {
    const raw = globalThis.window.localStorage.getItem(OFFLINE_MUTATION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is QueuedMutation => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<QueuedMutation>;
      return (
        typeof candidate.id === 'string'
        && typeof candidate.endpoint === 'string'
        && typeof candidate.method === 'string'
        && isMutationMethod(candidate.method)
        && typeof candidate.createdAt === 'number'
      );
    });
  } catch {
    return [];
  }
}

function writeQueuedMutations(queue: readonly QueuedMutation[]): void {
  if (!canUseBrowserStorage()) return;
  globalThis.window.localStorage.setItem(
    OFFLINE_MUTATION_QUEUE_KEY,
    JSON.stringify(queue)
  );
}

async function tryRegisterBackgroundSync(): Promise<void> {
  if (globalThis.window === undefined || globalThis.navigator === undefined) {
    return;
  }

  if (!('serviceWorker' in globalThis.navigator)) return;

  try {
    const registration = await globalThis.navigator.serviceWorker.ready;
    const syncCapable = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };

    if (typeof syncCapable.sync?.register === 'function') {
      await syncCapable.sync.register(OFFLINE_SYNC_TAG);
    }
  } catch {
    // Background sync can be unsupported/blocked. Online replay fallback remains active.
  }
}

function enqueueOfflineMutation(item: Omit<QueuedMutation, 'id' | 'createdAt'>): void {
  const queue = readQueuedMutations();
  const queuedItem: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    ...item,
  };
  queue.push(queuedItem);
  writeQueuedMutations(queue);
}

async function flushQueuedMutations(): Promise<void> {
  if (!canUseBrowserStorage() || isQueueFlushRunning) return;
  if (globalThis.navigator?.onLine === false) {
    return;
  }

  const queue = readQueuedMutations();
  if (queue.length === 0) return;

  isQueueFlushRunning = true;

  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      const response = await fetch(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        body: item.body,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
      break;
    }
  }

  writeQueuedMutations(remaining);
  isQueueFlushRunning = false;
}

function ensureOfflineMutationSync(): void {
  if (!canUseBrowserStorage() || onlineListenerAttached) return;

  onlineListenerAttached = true;
  globalThis.window.addEventListener('online', () => {
    void flushQueuedMutations();
  });

  void flushQueuedMutations();
}

function notifyBackendHealth(
  status: BackendHealthStatus,
  statusCode?: number,
  reason?: string
): void {
  if (latestBackendHealthStatus === status && statusCode === undefined && !reason) {
    return;
  }

  latestBackendHealthStatus = status;
  dispatchBackendHealthEvent({
    status,
    source: 'dashboard-api-service',
    statusCode,
    reason,
  });
}

// ── Request Helpers ────────────────────────────────────────
async function getAuthToken(): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const match = /access_token=([^;]+)/.exec(document.cookie);
  return match ? match[1] : null;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  ensureOfflineMutationSync();

  const token = await getAuthToken();
  const resolvedMethod = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      method: resolvedMethod,
      headers,
      credentials: 'include',
    });
  } catch {
    if (shouldQueueOfflineMutation(endpoint, resolvedMethod)) {
      enqueueOfflineMutation({
        endpoint,
        method: resolvedMethod as MutationMethod,
        body: typeof options.body === 'string' ? options.body : null,
        headers,
      });
      await tryRegisterBackgroundSync();
      notifyBackendHealth('degraded', undefined, 'offline-queued');
      return {
        queued: true,
        queuedAt: new Date().toISOString(),
      } as T;
    }

    notifyBackendHealth('degraded', undefined, 'network-error');
    throw new ApiError(0, 'Network request failed');
  }

  if (res.status >= 500) {
    notifyBackendHealth('degraded', res.status, 'server-error');
  } else if (res.ok) {
    notifyBackendHealth('healthy');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, err.message || 'Unknown error');
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Build endpoint with optional query string */
function withQuery(path: string, qs: string): string {
  return qs ? `${path}?${qs}` : path;
}

// ── Fleet API ──────────────────────────────────────────────
export const fleetApi = {
  getTrucks: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return apiRequest<{ trucks: TruckResponse[]; total: number; page: number }>(withQuery('/trucks', qs));
  },

  getTruck: (id: string) =>
    apiRequest<TruckResponse>(`/trucks/${id}`),

  updateTruck: (id: string, data: Partial<TruckResponse>) =>
    apiRequest<TruckResponse>(`/trucks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateTruckStatus: (id: string, status: TruckStatus) =>
    apiRequest<TruckResponse>(`/trucks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  addTruckNote: (
    id: string,
    payload: {
      note: string;
      author?: string;
      createdAt?: string;
    }
  ) =>
    apiRequest<{
      id?: string;
      note?: string;
      queued?: boolean;
      queuedAt?: string;
    }>(`/trucks/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTruck: (id: string) =>
    apiRequest<void>(`/trucks/${id}`, { method: 'DELETE' }),

  getTruckTelemetry: (id: string, params?: { from?: string; to?: string; interval?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.interval) searchParams.set('interval', params.interval);
    const qs = searchParams.toString();
    return apiRequest<{ data: TelemetryResponse[] }>(withQuery(`/trucks/${id}/telemetry`, qs));
  },
};

// ── Alerts API ─────────────────────────────────────────────
export const alertsApi = {
  getAlerts: (params?: { severity?: string; status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return apiRequest<{ alerts: AlertResponse[]; total: number }>(withQuery('/alerts', qs));
  },

  acknowledgeAlert: (id: string) =>
    apiRequest<AlertResponse>(`/alerts/${id}/acknowledge`, { method: 'POST' }),

  resolveAlert: (id: string) =>
    apiRequest<AlertResponse>(`/alerts/${id}/resolve`, { method: 'POST' }),

  deleteAlert: (id: string) =>
    apiRequest<void>(`/alerts/${id}`, { method: 'DELETE' }),

  // Alert Rules
  getRules: () =>
    apiRequest<{ rules: AlertRuleResponse[] }>('/alerts/rules'),

  createRule: (rule: CreateAlertRuleRequest) =>
    apiRequest<AlertRuleResponse>('/alerts/rules', { method: 'POST', body: JSON.stringify(rule) }),

  updateRule: (id: string, rule: Partial<CreateAlertRuleRequest>) =>
    apiRequest<AlertRuleResponse>(`/alerts/rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) }),

  deleteRule: (id: string) =>
    apiRequest<void>(`/alerts/rules/${id}`, { method: 'DELETE' }),
};

// ── Reports API ────────────────────────────────────────────
export const reportsApi = {
  getFleetSummary: (params?: { from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    const qs = searchParams.toString();
    return apiRequest<FleetSummaryResponse>(withQuery('/reports/fleet-summary', qs));
  },

  getTemperatureReport: (params?: { from?: string; to?: string; truckId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.truckId) searchParams.set('truckId', params.truckId);
    const qs = searchParams.toString();
    return apiRequest<{ data: TemperatureReportRow[] }>(withQuery('/reports/temperature', qs));
  },

  getDeliveryReport: (params?: { from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    const qs = searchParams.toString();
    return apiRequest<{ data: DeliveryReportRow[] }>(withQuery('/reports/deliveries', qs));
  },
};

// ── Settings API ───────────────────────────────────────────
export const settingsApi = {
  getApiKeys: () =>
    apiRequest<{ keys: ApiKeyResponse[] }>('/settings/api-keys'),

  createApiKey: (name: string, permissions: string[]) =>
    apiRequest<ApiKeyResponse>('/settings/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    }),

  revokeApiKey: (id: string) =>
    apiRequest<void>(`/settings/api-keys/${id}`, { method: 'DELETE' }),

  getSecuritySettings: () =>
    apiRequest<SecuritySettingsResponse>('/settings/security'),

  updateSecuritySettings: (data: Partial<SecuritySettingsResponse>) =>
    apiRequest<SecuritySettingsResponse>('/settings/security', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Response Types ─────────────────────────────────────────
export type SeverityLevel = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type RuleCondition = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
export type TruckStatus = 'active' | 'idle' | 'maintenance' | 'offline' | 'alert';

export interface TruckResponse {
  id: string;
  name: string;
  plateNumber: string;
  status: TruckStatus;
  driver: string;
  temperature: number;
  humidity: number;
  speed: number;
  fuelLevel: number;
  batteryLevel: number;
  lat: number;
  lng: number;
  lastUpdate: string;
  totalDistance: number;
  deliveries: number;
  route?: string;
}

export interface TelemetryResponse {
  timestamp: string;
  temperature: number;
  humidity: number;
  speed: number;
  fuelLevel: number;
  batteryLevel: number;
  lat: number;
  lng: number;
  doorOpen: boolean;
}

export interface AlertResponse {
  id: string;
  truckId: string;
  truckName: string;
  type: string;
  severity: SeverityLevel;
  message: string;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface AlertRuleResponse {
  id: string;
  name: string;
  metric: string;
  condition: RuleCondition;
  threshold: number;
  thresholdMax?: number;
  severity: SeverityLevel;
  enabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  createdAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  metric: string;
  condition: RuleCondition;
  threshold: number;
  thresholdMax?: number;
  severity: SeverityLevel;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

export interface FleetSummaryResponse {
  totalTrucks: number;
  activeTrucks: number;
  totalDeliveries: number;
  avgTemperature: number;
  totalDistance: number;
  fuelConsumed: number;
  uptime: number;
  alerts: number;
}

export interface TemperatureReportRow {
  timestamp: string;
  truckId: string;
  truckName: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  violations: number;
}

export interface DeliveryReportRow {
  date: string;
  total: number;
  completed: number;
  failed: number;
  avgDuration: number;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: string;
  createdAt: string;
}

export interface SecuritySettingsResponse {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  loginAttempts: number;
  passwordExpiry: number;
}
