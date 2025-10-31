/**
 * Shared API contracts used across backend and dashboard.
 * Keep these as pure TypeScript types so both packages (with different zod versions) can consume them.
 */

export type FleetSummary = Readonly<{
  activeTrucks: number;
  avgCargoTempC: number; // Celsius
  anomalyIndex: number; // 0..100, may be NaN/undefined when stale
  onTimeRatePct: number; // 0..100
  fuelEfficiencyKmPerL: number; // numeric efficiency value
  activeDrivers: number;
  deliveriesCompleted: number;
}>;

export type AlertsSummary = Readonly<{
  total: number;
  critical: number;
  warning: number;
  info: number;
}>; // invariant: total === critical + warning + info

export type HealthTier1 = Readonly<{
  service: string;
  status: 'online' | 'offline' | 'degraded';
  latencyMs: number | null; // null when unknown or offline
  uptimePct: number | null; // null when unknown
  lastChange: string; // ISO timestamp
}>;

export type TelemetryState = Readonly<{
  activeStreams: number; // e.g., number of trucks reporting
  lastIngestedAt: number | null; // epoch millis of last telemetry
}>;
