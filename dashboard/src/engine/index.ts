/* ================================================================
 *  Ice-Truck IoT Engine — Public API
 *  ─────────────────────────────────
 *  Import everything from '@/engine' or '@/engine/index'.
 * ================================================================ */

// Types
export type {
    TruckTelemetry,
    TruckStatus,
    AlertLevel,
    TelemetryAlert,
    Geofence,
    GeofenceEvent,
    FleetMetrics,
    TimeSeriesPoint,
    ChartDataset,
    WorkerInbound,
    WorkerOutbound,
    WorkerConfig,
    Theme,
    ThemeColors,
    FrameCallback,
    PerfSnapshot,
} from './types';

// Store
export {
    useIoTStore,
    getTruckMap,
    getAlerts,
    getChartBuffer,
    upsertTruck,
    upsertTruckBatch,
    pushAlert,
    acknowledgeAlert,
    pushChartPoint,
} from './store';
export type { IoTStoreState } from './store';

// Frame Scheduler
export { frameScheduler } from './frameScheduler';

// Ring Buffer
export { RingBuffer } from './ringBuffer';

// Layers
export { ImperativeThreeLayer } from './threeLayer';
export { ImperativeMapLayer } from './mapLayer';
export { ImperativeChart } from './chartEngine';
export type { ChartSeries, ChartConfig } from './chartEngine';

// Performance Overlay
export { PerformanceOverlay } from './perfOverlay';

// Orchestrator (main entry point)
export {
    bootEngine,
    shutdownEngine,
    mount3D,
    unmount3D,
    mountMap,
    unmountMap,
    mountChart,
    unmountChart,
    pushToChart,
    getMapLayer,
    getThreeLayer,
    getPerfOverlay,
    getFrameScheduler,
} from './orchestrator';
