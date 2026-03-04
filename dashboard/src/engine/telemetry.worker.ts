/* ================================================================
 *  Ice-Truck IoT Engine — Telemetry Web Worker
 *  ────────────────────────────────────────────
 *  Runs OFF the main thread.  Responsibilities:
 *    1. Maintain WebSocket connection to backend
 *    2. Parse incoming telemetry messages
 *    3. Aggregate fleet metrics every N ms
 *    4. Down-sample chart data
 *    5. Post minimal deltas to main thread
 *
 *  This file is loaded via `new Worker(new URL(...), import.meta.url)`
 *  so Next.js (Webpack 5 / Turbopack) can resolve it.
 * ================================================================ */

import type {
    WorkerInbound,
    WorkerOutbound,
    WorkerConfig,
    TruckTelemetry,
    TelemetryAlert,
    FleetMetrics,
    TimeSeriesPoint,
    TruckStatus,
} from './types';

// ─── State inside the worker ───────────────────────────────────
let ws: WebSocket | null = null;
let config: WorkerConfig = {
    wsUrl: 'ws://localhost:5000',
    apiUrl: 'http://localhost:5000',
    metricsInterval: 500,
    chartDownsample: 1000,
    maxTrucks: 10_000,
};

/** Mutable truck map — the source of truth inside the worker */
const trucks = new Map<string, TruckTelemetry>();

/** Pending batch — accumulated between frames */
let pendingBatch: TruckTelemetry[] = [];
const BATCH_FLUSH_MS = 16; // ~60 Hz

/** Alert counter */
let alertSeq = 0;

/** Metrics aggregation timer */
let metricsTimer: ReturnType<typeof setInterval> | null = null;
let chartTimer: ReturnType<typeof setInterval> | null = null;
let batchTimer: ReturnType<typeof setInterval> | null = null;

/** Retry state */
let retryCount = 0;
const MAX_RETRIES = 10;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Simulation (when no real backend) ─────────────────────────
let simInterval: ReturnType<typeof setInterval> | null = null;
const SIM_TRUCK_COUNT = 55;
const SIM_INTERVAL_MS = 100; // 10 updates/sec per truck → ~550 events/sec

function startSimulation(): void {
    // Seed initial trucks
    for (let i = 1; i <= SIM_TRUCK_COUNT; i++) {
        const id = `T${String(i).padStart(3, '0')}`;
        trucks.set(id, {
            id,
            lat: 13.7 + (Math.random() - 0.5) * 0.4,
            lng: 100.5 + (Math.random() - 0.5) * 0.4,
            speed: 30 + Math.random() * 60,
            heading: Math.random() * 360,
            temperature: -8 + Math.random() * 6,
            fuelLevel: 40 + Math.random() * 60,
            engineRpm: 1200 + Math.random() * 2000,
            odometer: 10000 + Math.random() * 90000,
            status: 'active' as TruckStatus,
            driverName: `Driver ${i}`,
            routeId: `R${String(Math.ceil(i / 5)).padStart(2, '0')}`,
            timestamp: Date.now(),
        });
    }

    // Emit initial batch
    const initial = Array.from(trucks.values());
    post({ type: 'truck-batch', payload: initial });

    // Continuous simulation
    simInterval = setInterval(() => {
        const now = Date.now();
        const batch: TruckTelemetry[] = [];

        trucks.forEach((t) => {
            // Random walk
            const dLat = (Math.random() - 0.5) * 0.001;
            const dLng = (Math.random() - 0.5) * 0.001;
            t.lat += dLat;
            t.lng += dLng;
            t.heading = (t.heading + (Math.random() - 0.5) * 10 + 360) % 360;
            t.speed = Math.max(0, Math.min(120, t.speed + (Math.random() - 0.5) * 5));
            t.temperature += (Math.random() - 0.5) * 0.3;
            t.temperature = Math.max(-15, Math.min(5, t.temperature));
            t.fuelLevel = Math.max(5, Math.min(100, t.fuelLevel - Math.random() * 0.05));
            t.engineRpm = 800 + Math.random() * 2800;
            t.timestamp = now;

            // Random status changes
            if (Math.random() < 0.002) {
                const statuses: TruckStatus[] = ['active', 'idle', 'offline', 'maintenance'];
                t.status = statuses[Math.floor(Math.random() * statuses.length)];
            }

            batch.push({ ...t });
        });

        // Send batch to main thread
        pendingBatch.push(...batch);

        // Random alerts
        if (Math.random() < 0.05) {
            const truckIds = Array.from(trucks.keys());
            const truckId = truckIds[Math.floor(Math.random() * truckIds.length)];
            const truck = trucks.get(truckId);
            if (!truck) return;
            const alert: TelemetryAlert = {
                id: `A${++alertSeq}`,
                truckId,
                level: randomAlertLevel(),
                message: Math.random() < 0.5
                    ? `Temperature deviation: ${truck.temperature.toFixed(1)}°C`
                    : `Speed alert: ${truck.speed.toFixed(0)} km/h`,
                timestamp: now,
                acknowledged: false,
                location: { lat: truck.lat, lng: truck.lng },
            };
            post({ type: 'alert', payload: alert });
        }
    }, SIM_INTERVAL_MS);
}

function stopSimulation(): void {
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
}

// ─── WebSocket management ──────────────────────────────────────
function connectWebSocket(): void {
    if (ws) {
        ws.onclose = null;
        ws.close();
    }

    try {
        ws = new WebSocket(config.wsUrl.replace(/^http/, 'ws'));

        ws.onopen = () => {
            retryCount = 0;
            post({ type: 'connection-status', payload: 'connected' });
            stopSimulation(); // stop sim if real backend available
        };

        ws.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data as string);
                handleIncomingTelemetry(data);
            } catch {
                // ignore malformed messages
            }
        };

        ws.onclose = () => {
            post({ type: 'connection-status', payload: 'disconnected' });
            scheduleReconnect();
        };

        ws.onerror = () => {
            // onclose will fire after onerror
        };
    } catch {
        post({ type: 'connection-status', payload: 'disconnected' });
        // Start simulation as fallback
        startSimulation();
    }
}

function scheduleReconnect(): void {
    if (retryCount >= MAX_RETRIES) {
        // Fall back to simulation
        startSimulation();
        return;
    }
    retryCount++;
    post({ type: 'connection-status', payload: 'reconnecting' });
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30_000);
    retryTimeout = setTimeout(connectWebSocket, delay);
}

// ─── Message parsing ───────────────────────────────────────────
function handleIncomingTelemetry(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const d = data as Record<string, unknown>;

    // Full snapshot
    if (Array.isArray(d.trucks)) {
        const batch: TruckTelemetry[] = [];
        for (const raw of d.trucks) {
            const t = normalizeTruck(raw);
            if (t) {
                trucks.set(t.id, t);
                batch.push(t);
            }
        }
        if (batch.length) pendingBatch.push(...batch);
    }

    // Single truck update
    if (d.type === 'truck' && d.payload) {
        const t = normalizeTruck(d.payload);
        if (t) {
            trucks.set(t.id, t);
            pendingBatch.push(t);
        }
    }

    // Alert
    if (d.type === 'alert' && d.payload) {
        const p = d.payload as Record<string, unknown>;
        const alert: TelemetryAlert = {
            id: (p.id as string) || `A${++alertSeq}`,
            truckId: (p.truckId as string) || '',
            level: (p.level as TelemetryAlert['level']) || 'info',
            message: (p.message as string) || '',
            timestamp: (p.timestamp as number) || Date.now(),
            acknowledged: false,
        };
        post({ type: 'alert', payload: alert });
    }
}

function normalizeTruck(raw: unknown): TruckTelemetry | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const id = (r.id as string) || (r.truck_id as string);
    if (!id) return null;

    return {
        id,
        lat: Number(r.lat ?? r.latitude ?? 0),
        lng: Number(r.lng ?? r.longitude ?? 0),
        speed: Number(r.speed ?? 0),
        heading: Number(r.heading ?? 0),
        temperature: Number(r.temperature ?? r.temp ?? 0),
        fuelLevel: Number(r.fuelLevel ?? r.fuel_level ?? 100),
        engineRpm: Number(r.engineRpm ?? r.engine_rpm ?? 0),
        odometer: Number(r.odometer ?? 0),
        status: (r.status as TruckTelemetry['status']) ?? 'active',
        driverName: (r.driverName as string) ?? (r.driver_name as string) ?? '',
        routeId: (r.routeId as string) ?? (r.route_id as string) ?? '',
        timestamp: Number(r.timestamp ?? Date.now()),
    };
}

// ─── Metrics aggregation (runs every config.metricsInterval) ───
function computeMetrics(): FleetMetrics {
    let activeTrucks = 0, idleTrucks = 0, offlineTrucks = 0;
    let totalTemp = 0, minTemp = Infinity, maxTemp = -Infinity;
    let totalSpeed = 0, totalFuel = 0;
    let count = 0;

    trucks.forEach((t) => {
        count++;
        if (t.status === 'active') activeTrucks++;
        else if (t.status === 'idle') idleTrucks++;
        else if (t.status === 'offline') offlineTrucks++;

        totalTemp += t.temperature;
        if (t.temperature < minTemp) minTemp = t.temperature;
        if (t.temperature > maxTemp) maxTemp = t.temperature;
        totalSpeed += t.speed;
        totalFuel += t.fuelLevel;
    });

    const n = count || 1;
    return {
        activeTrucks,
        idleTrucks,
        offlineTrucks,
        avgTemperature: totalTemp / n,
        minTemperature: minTemp === Infinity ? 0 : minTemp,
        maxTemperature: maxTemp === -Infinity ? 0 : maxTemp,
        avgSpeed: totalSpeed / n,
        totalAlerts: alertSeq,
        criticalAlerts: Math.floor(alertSeq * 0.1),
        warningAlerts: Math.floor(alertSeq * 0.3),
        avgFuelLevel: totalFuel / n,
        onTimeRate: 94 + Math.random() * 5,
        totalDeliveries: Math.floor(200 + activeTrucks * 3.5),
        revenueToday: Math.floor(35000 + activeTrucks * 250),
        activeDrivers: activeTrucks,
        fuelEfficiency: 7.5 + Math.random() * 1.5,
        timestamp: Date.now(),
    };
}

// ─── Chart downsampling ────────────────────────────────────────
function emitChartPoints(): void {
    const now = Date.now();
    const m = computeMetrics();

    const chartPoints: Array<{ series: string; point: TimeSeriesPoint }> = [
        { series: 'temperature', point: { timestamp: now, value: m.avgTemperature } },
        { series: 'speed', point: { timestamp: now, value: m.avgSpeed } },
        { series: 'fuel', point: { timestamp: now, value: m.avgFuelLevel } },
        { series: 'active-trucks', point: { timestamp: now, value: m.activeTrucks } },
        { series: 'alerts', point: { timestamp: now, value: m.totalAlerts } },
        { series: 'revenue', point: { timestamp: now, value: m.revenueToday } },
    ];

    for (const cp of chartPoints) {
        post({ type: 'chart-delta', payload: cp });
    }
}

// ─── Batch flusher (16ms → 60 Hz) ─────────────────────────────
function flushBatch(): void {
    if (pendingBatch.length === 0) return;
    post({ type: 'truck-batch', payload: pendingBatch });
    pendingBatch = [];
}

// ─── postMessage helper ────────────────────────────────────────
function post(msg: WorkerOutbound): void {
    (globalThis as unknown as Worker).postMessage(msg);
}

// ─── Alert level helper ────────────────────────────────────────
function randomAlertLevel(): 'critical' | 'warning' | 'info' {
    const r = Math.random();
    if (r < 0.1) return 'critical';
    if (r < 0.3) return 'warning';
    return 'info';
}

// ─── Incoming messages from main thread ────────────────────────
globalThis.onmessage = (ev: MessageEvent<WorkerInbound>) => {
    const msg = ev.data;

    switch (msg.type) {
        case 'config':
            config = { ...config, ...msg.payload };
            // Restart timers
            startTimers();
            // Connect (will fall back to simulation)
            connectWebSocket();
            break;

        case 'ws-message':
            handleIncomingTelemetry(JSON.parse(msg.payload));
            break;

        case 'reset':
            trucks.clear();
            alertSeq = 0;
            pendingBatch = [];
            stopSimulation();
            break;
    }
};

// ─── Timer management ──────────────────────────────────────────
function startTimers(): void {
    if (metricsTimer) clearInterval(metricsTimer);
    if (chartTimer) clearInterval(chartTimer);
    if (batchTimer) clearInterval(batchTimer);

    metricsTimer = setInterval(() => {
        post({ type: 'metrics', payload: computeMetrics() });
    }, config.metricsInterval);

    chartTimer = setInterval(emitChartPoints, config.chartDownsample);

    batchTimer = setInterval(flushBatch, BATCH_FLUSH_MS);
}

// ─── Bootstrap ─────────────────────────────────────────────────
startTimers();
// Attempt connection immediately; will fallback to simulation
connectWebSocket();
