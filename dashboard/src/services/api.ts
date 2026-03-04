/**
 * API Service — Centralized API client with auth, retry, and error handling.
 * Provides typed methods for all backend endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

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
