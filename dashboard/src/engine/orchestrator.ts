/* ================================================================
 *  Ice-Truck IoT Engine — Orchestrator
 *  ─────────────────────────────────────
 *  Wires together:
 *    Worker → Store → Frame Scheduler → Map / 3D / Charts / Perf
 *
 *  Architecture:
 *    Kafka / WebSocket
 *          ↓
 *    Worker Layer (off-thread)
 *          ↓
 *    Zustand Transient Store (mutable Map)
 *          ↓
 *    Frame Scheduler (requestAnimationFrame)
 *          ↓
 *    Imperative Map / 3D / Chart / Perf Overlay
 *
 *  React only renders: Shell, Panels, Controls, Forms.
 * ================================================================ */

import type { WorkerOutbound, WorkerConfig } from './types';
import {
    useIoTStore,
    upsertTruck,
    upsertTruckBatch,
    pushAlert,
    pushChartPoint,
} from './store';
import { frameScheduler } from './frameScheduler';
import { ImperativeThreeLayer } from './threeLayer';
import { ImperativeMapLayer } from './mapLayer';
import { ImperativeChart } from './chartEngine';
import { PerformanceOverlay } from './perfOverlay';

// ─── Singleton instances ───────────────────────────────────────
let worker: Worker | null = null;
let threeLayer: ImperativeThreeLayer | null = null;
let mapLayer: ImperativeMapLayer | null = null;
let perfOverlay: PerformanceOverlay | null = null;
const charts = new Map<string, ImperativeChart>();
let _booted = false;

// ─── Public API ────────────────────────────────────────────────

/** Boot the entire IoT engine. Call once from the dashboard mount. */
export function bootEngine(config?: Partial<WorkerConfig>): void {
    if (_booted) return;
    _booted = true;

    const fullConfig: WorkerConfig = {
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        metricsInterval: 500,
        chartDownsample: 1000,
        maxTrucks: 10_000,
        ...config,
    };

    // 1) Spawn Web Worker
    try {
        worker = new Worker(
            new URL('./telemetry.worker.ts', import.meta.url),
            { type: 'module' },
        );

        worker.onmessage = (ev: MessageEvent<WorkerOutbound>) => {
            handleWorkerMessage(ev.data);
        };

        worker.onerror = (err) => {
            console.error('[IoT Engine] Worker error:', err);
        };

        // Send config to worker
        worker.postMessage({ type: 'config', payload: fullConfig });
    } catch (err) {
        console.warn('[IoT Engine] Worker init failed, running in-thread fallback:', err);
        // Simulation will be driven by the worker's own internal fallback
    }

    // 2) Start frame scheduler
    frameScheduler.start();

    // 3) Performance overlay
    perfOverlay = new PerformanceOverlay();
    frameScheduler.register('perf', (dt) => perfOverlay?.update(dt));

    console.log('[IoT Engine] Booted ✓');
}

/** Shutdown the engine. Call on unmount. */
export function shutdownEngine(): void {
    _booted = false;

    frameScheduler.stop();
    worker?.terminate();
    worker = null;

    threeLayer?.destroy();
    threeLayer = null;

    mapLayer?.destroy();
    mapLayer = null;

    charts.forEach((c) => c.destroy());
    charts.clear();

    perfOverlay?.destroy();
    perfOverlay = null;

    console.log('[IoT Engine] Shutdown ✓');
}

// ─── Layer mounting (called by React refs) ─────────────────────

/** Mount the Three.js 3D background into a container */
export function mount3D(container: HTMLElement): void {
    if (threeLayer) return;
    const theme = useIoTStore.getState().theme;
    threeLayer = new ImperativeThreeLayer();
    threeLayer.init(container, theme);
    frameScheduler.register('three', (dt) => threeLayer?.update(dt));
}

export function unmount3D(): void {
    frameScheduler.unregister('three');
    threeLayer?.destroy();
    threeLayer = null;
}

/** Mount the Mapbox GL map into a container */
export function mountMap(container: HTMLElement): void {
    if (mapLayer) return;
    const theme = useIoTStore.getState().theme;
    mapLayer = new ImperativeMapLayer();
    mapLayer.init(container, theme);
    frameScheduler.register('map', (dt) => mapLayer?.update(dt));
}

export function unmountMap(): void {
    frameScheduler.unregister('map');
    mapLayer?.destroy();
    mapLayer = null;
}

/** Register an imperative chart canvas */
export function mountChart(
    id: string,
    canvas: HTMLCanvasElement,
    config: Omit<ConstructorParameters<typeof ImperativeChart>[0], 'canvas'>,
): void {
    if (charts.has(id)) return;
    const chart = new ImperativeChart({ canvas, ...config });
    charts.set(id, chart);
    frameScheduler.register(`chart-${id}`, (dt) => chart.update(dt));
}

export function unmountChart(id: string): void {
    const chart = charts.get(id);
    if (!chart) return;
    frameScheduler.unregister(`chart-${id}`);
    chart.destroy();
    charts.delete(id);
}

/** Push data to a specific chart series */
export function pushToChart(chartId: string, seriesId: string, point: { timestamp: number; value: number }): void {
    const chart = charts.get(chartId);
    if (chart) chart.push(seriesId, point);
}

// ─── Accessors for layers ──────────────────────────────────────
export function getMapLayer(): ImperativeMapLayer | null {
    return mapLayer;
}

export function getThreeLayer(): ImperativeThreeLayer | null {
    return threeLayer;
}

export function getPerfOverlay(): PerformanceOverlay | null {
    return perfOverlay;
}

export function getFrameScheduler() {
    return frameScheduler;
}

// ─── Worker message handler ────────────────────────────────────
function handleWorkerMessage(msg: WorkerOutbound): void {
    const store = useIoTStore;

    // Record event for perf overlay
    perfOverlay?.recordEvent();

    switch (msg.type) {
        case 'truck-update':
            upsertTruck(msg.payload);
            break;

        case 'truck-batch':
            upsertTruckBatch(msg.payload);
            break;

        case 'alert':
            pushAlert(msg.payload);
            store.getState().incrementUnacknowledgedAlerts();
            break;

        case 'metrics':
            // This IS a React state update — triggers subscribed panels to re-render
            store.getState().setMetrics(msg.payload);
            break;

        case 'geofence-event':
            // Could dispatch to a geofence store — for now, log
            console.debug('[Geofence]', msg.payload);
            break;

        case 'chart-delta': {
            const { series, point } = msg.payload;
            pushChartPoint(series, point);
            // Also push to any mounted chart that has this series
            charts.forEach((chart) => {
                chart.push(series, point);
            });
            break;
        }

        case 'connection-status':
            store.getState().setConnectionStatus(msg.payload);
            break;
    }
}

// ─── Store subscriptions for imperative layers ─────────────────
// When theme changes, update 3D and map
useIoTStore.subscribe(
    (s) => s.theme,
    (theme) => {
        threeLayer?.setTheme(theme);
        mapLayer?.setStyle(theme);
    },
);

// When pause changes, pause/resume frame scheduler
useIoTStore.subscribe(
    (s) => s.paused,
    (paused) => {
        if (paused) frameScheduler.pause();
        else frameScheduler.resume();
    },
);
