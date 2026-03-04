/* ================================================================
 *  Ice-Truck IoT Engine — Zustand Transient Store
 *  ──────────────────────────────────────────────
 *  • Stores truck positions in a mutable Map (zero-copy)
 *  • Uses Zustand `subscribeWithSelector` for surgical re-renders
 *  • Transient updates: `setState(fn, false)` — NO React tree diff
 *  • React only subscribes to aggregated metrics & UI flags
 * ================================================================ */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
    TruckTelemetry,
    TelemetryAlert,
    FleetMetrics,
    TimeSeriesPoint,
    Theme,
} from './types';

// ─── Internal mutable containers (never cause re-render) ──────
/** Mutable truck map — updated imperatively by the frame loop */
const _trucks = new Map<string, TruckTelemetry>();

/** Mutable alert ring buffer — max 200 entries */
const _alerts: TelemetryAlert[] = [];
const MAX_ALERTS = 200;

/** Mutable chart ring buffers — key = series name */
const _chartBuffers = new Map<string, TimeSeriesPoint[]>();
const MAX_CHART_POINTS = 360; // 6 min @ 1pt/sec

// ─── Public accessors (no React subscription) ──────────────────
export function getTruckMap(): ReadonlyMap<string, TruckTelemetry> {
    return _trucks;
}

export function getAlerts(): readonly TelemetryAlert[] {
    return _alerts;
}

export function getChartBuffer(series: string): readonly TimeSeriesPoint[] {
    return _chartBuffers.get(series) ?? [];
}

// ─── Imperative mutators (called from frame scheduler) ─────────
export function upsertTruck(t: TruckTelemetry): void {
    _trucks.set(t.id, t);
}

export function upsertTruckBatch(batch: TruckTelemetry[]): void {
    for (let i = 0; i < batch.length; i++) {
        _trucks.set(batch[i].id, batch[i]);
    }
}

export function pushAlert(a: TelemetryAlert): void {
    _alerts.unshift(a);
    if (_alerts.length > MAX_ALERTS) _alerts.length = MAX_ALERTS;
}

export function acknowledgeAlert(id: string): void {
    const a = _alerts.find((x) => x.id === id);
    if (a) a.acknowledged = true;
}

export function pushChartPoint(series: string, pt: TimeSeriesPoint): void {
    let buf = _chartBuffers.get(series);
    if (!buf) {
        buf = [];
        _chartBuffers.set(series, buf);
    }
    buf.push(pt);
    if (buf.length > MAX_CHART_POINTS) buf.shift();
}

// ─── Zustand Store (React-subscribed state — minimal) ──────────
export interface IoTStoreState {
    // ── Aggregated metrics (updated every ~500ms) ────────────────
    metrics: FleetMetrics;
    // ── Connection ───────────────────────────────────────────────
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
    // ── UI preferences ──────────────────────────────────────────
    theme: Theme;
    paused: boolean;
    showGrid: boolean;
    show3D: boolean;
    showMap: boolean;
    showAlerts: boolean;
    timeRange: '1h' | '24h' | '7d' | '30d' | '90d';
    refreshSpeed: 'fast' | 'normal' | 'slow';
    searchTerm: string;
    // ── Alert badge count (derived, triggers re-render) ──────────
    unacknowledgedAlerts: number;
    // ── Tick counter — bumped by frame scheduler to nudge panels ─
    frameTick: number;
    // ── Actions ──────────────────────────────────────────────────
    setMetrics: (m: FleetMetrics) => void;
    setConnectionStatus: (s: 'connected' | 'disconnected' | 'reconnecting') => void;
    setTheme: (t: Theme) => void;
    togglePause: () => void;
    toggleGrid: () => void;
    toggle3D: () => void;
    toggleMap: () => void;
    toggleAlerts: () => void;
    setTimeRange: (r: '1h' | '24h' | '7d' | '30d' | '90d') => void;
    setRefreshSpeed: (s: 'fast' | 'normal' | 'slow') => void;
    setSearchTerm: (s: string) => void;
    bumpTick: () => void;
    incrementUnacknowledgedAlerts: () => void;
    decrementUnacknowledgedAlerts: () => void;
}

const DEFAULT_METRICS: FleetMetrics = {
    activeTrucks: 0,
    idleTrucks: 0,
    offlineTrucks: 0,
    avgTemperature: 0,
    minTemperature: 0,
    maxTemperature: 0,
    avgSpeed: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    avgFuelLevel: 0,
    onTimeRate: 0,
    totalDeliveries: 0,
    revenueToday: 0,
    activeDrivers: 0,
    fuelEfficiency: 0,
    timestamp: 0,
};

export const useIoTStore = create<IoTStoreState>()(
    subscribeWithSelector((set) => ({
        metrics: DEFAULT_METRICS,
        connectionStatus: 'disconnected',
        theme: 'dark',
        paused: false,
        showGrid: true,
        show3D: true,
        showMap: true,
        showAlerts: false,
        timeRange: '7d',
        refreshSpeed: 'normal',
        searchTerm: '',
        unacknowledgedAlerts: 0,
        frameTick: 0,

        setMetrics: (m) => set({ metrics: m }),
        setConnectionStatus: (s) => set({ connectionStatus: s }),
        setTheme: (t) => set({ theme: t }),
        togglePause: () => set((s) => ({ paused: !s.paused })),
        toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
        toggle3D: () => set((s) => ({ show3D: !s.show3D })),
        toggleMap: () => set((s) => ({ showMap: !s.showMap })),
        toggleAlerts: () => set((s) => ({ showAlerts: !s.showAlerts })),
        setTimeRange: (r) => set({ timeRange: r }),
        setRefreshSpeed: (s) => set({ refreshSpeed: s }),
        setSearchTerm: (s) => set({ searchTerm: s }),
        bumpTick: () => set((s) => ({ frameTick: s.frameTick + 1 })),
        incrementUnacknowledgedAlerts: () =>
            set((s) => ({ unacknowledgedAlerts: s.unacknowledgedAlerts + 1 })),
        decrementUnacknowledgedAlerts: () =>
            set((s) => ({
                unacknowledgedAlerts: Math.max(0, s.unacknowledgedAlerts - 1),
            })),
    })),
);
