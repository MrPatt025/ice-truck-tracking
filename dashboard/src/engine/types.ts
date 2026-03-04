/* ================================================================
 *  Ice-Truck IoT Engine — Shared Type Definitions
 *  All types live here so every module imports from one source.
 * ================================================================ */

// ─── Vehicle Telemetry ─────────────────────────────────────────
export interface TruckTelemetry {
    id: string;
    lat: number;
    lng: number;
    speed: number;          // km/h
    heading: number;        // 0-360 degrees
    temperature: number;    // cargo temp °C
    fuelLevel: number;      // 0-100%
    engineRpm: number;
    odometer: number;       // km
    status: TruckStatus;
    driverName: string;
    routeId: string;
    timestamp: number;      // epoch ms
}

export type TruckStatus = 'active' | 'idle' | 'offline' | 'maintenance' | 'alert';

// ─── Alerts ────────────────────────────────────────────────────
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface TelemetryAlert {
    id: string;
    truckId: string;
    level: AlertLevel;
    message: string;
    timestamp: number;
    acknowledged: boolean;
    location?: { lat: number; lng: number };
}

// ─── Geofence ──────────────────────────────────────────────────
export interface Geofence {
    id: string;
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radius?: number;        // metres
    points?: { lat: number; lng: number }[];
}

export interface GeofenceEvent {
    id: string;
    truckId: string;
    geofenceId: string;
    type: 'entry' | 'exit' | 'dwell';
    timestamp: number;
    location: { lat: number; lng: number };
}

// ─── Aggregated Metrics (computed by Worker) ───────────────────
export interface FleetMetrics {
    activeTrucks: number;
    idleTrucks: number;
    offlineTrucks: number;
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
    avgSpeed: number;
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    avgFuelLevel: number;
    onTimeRate: number;
    totalDeliveries: number;
    revenueToday: number;
    activeDrivers: number;
    fuelEfficiency: number;
    timestamp: number;
}

// ─── Ring Buffer entry for charts ──────────────────────────────
export interface TimeSeriesPoint {
    timestamp: number;
    value: number;
    label?: string;
}

export interface ChartDataset {
    id: string;
    label: string;
    color: string;
    points: TimeSeriesPoint[];
}

// ─── Worker Messages ───────────────────────────────────────────
export type WorkerInbound =
    | { type: 'ws-message'; payload: string }
    | { type: 'config'; payload: WorkerConfig }
    | { type: 'reset' };

export type WorkerOutbound =
    | { type: 'truck-update'; payload: TruckTelemetry }
    | { type: 'truck-batch'; payload: TruckTelemetry[] }
    | { type: 'alert'; payload: TelemetryAlert }
    | { type: 'metrics'; payload: FleetMetrics }
    | { type: 'geofence-event'; payload: GeofenceEvent }
    | { type: 'chart-delta'; payload: { series: string; point: TimeSeriesPoint } }
    | { type: 'connection-status'; payload: 'connected' | 'disconnected' | 'reconnecting' };

export interface WorkerConfig {
    wsUrl: string;
    apiUrl: string;
    metricsInterval: number;  // ms between aggregated metrics pushes
    chartDownsample: number;  // ms between chart point emissions
    maxTrucks: number;
}

// ─── Theme ─────────────────────────────────────────────────────
export type Theme = 'dark' | 'neon' | 'ocean' | 'forest';

export interface ThemeColors {
    primary: number[];
    gradient: string;
    accent: string;
    mapStyle: string;
}

// ─── Frame Scheduler ───────────────────────────────────────────
export type FrameCallback = (dt: number) => void;

// ─── Performance Metrics ───────────────────────────────────────
export interface PerfSnapshot {
    fps: number;
    frameTime: number;       // ms
    heapUsed: number;        // MB
    heapTotal: number;       // MB
    domNodes: number;
    timestamp: number;
}
