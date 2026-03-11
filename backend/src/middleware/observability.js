/**
 * Enhanced Observability Metrics
 * ────────────────────────────────
 * Extends the base Prometheus metrics with:
 *   • WebSocket connection tracking
 *   • Business-level fleet metrics
 *   • Telemetry ingestion rates
 *   • Database pool utilization
 *   • Cache hit/miss ratios
 *
 * All metrics are registered on the shared Prometheus registry.
 */
const client = require('prom-client');
const { register } = require('./metrics');

// ─── WebSocket Metrics ─────────────────────────────────────────

const wsConnectionsGauge = new client.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
});

const wsMessagesTotal = new client.Counter({
    name: 'websocket_messages_total',
    help: 'Total WebSocket messages sent/received',
    labelNames: ['direction'], // 'inbound' | 'outbound'
});

const wsErrorsTotal = new client.Counter({
    name: 'websocket_errors_total',
    help: 'Total WebSocket errors',
    labelNames: ['type'],
});

// ─── Fleet / Business Metrics ──────────────────────────────────

const fleetTrucksGauge = new client.Gauge({
    name: 'fleet_trucks_total',
    help: 'Number of trucks by status',
    labelNames: ['status'], // active, idle, offline, maintenance
});

const fleetDeliveriesTotal = new client.Counter({
    name: 'fleet_deliveries_total',
    help: 'Total completed deliveries',
    labelNames: ['region'],
});

const fleetTemperatureGauge = new client.Gauge({
    name: 'fleet_temperature_celsius',
    help: 'Current fleet temperature metrics',
    labelNames: ['metric'], // avg, min, max
});

const fleetAlertsTotal = new client.Counter({
    name: 'fleet_alerts_total',
    help: 'Total alerts by severity',
    labelNames: ['severity'], // info, warning, critical
});

// ─── Telemetry Ingestion ───────────────────────────────────────

const telemetryIngestionRate = new client.Counter({
    name: 'telemetry_ingestion_total',
    help: 'Total telemetry data points ingested',
    labelNames: ['source'], // mqtt, websocket, api
});

const telemetryIngestionDuration = new client.Histogram({
    name: 'telemetry_ingestion_duration_seconds',
    help: 'Duration of telemetry ingestion processing',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

const telemetryBatchSize = new client.Histogram({
    name: 'telemetry_batch_size',
    help: 'Size of telemetry ingestion batches',
    buckets: [1, 10, 50, 100, 500, 1000, 5000],
});

// ─── Database Pool Metrics ─────────────────────────────────────

const dbPoolGauge = new client.Gauge({
    name: 'db_pool_connections',
    help: 'Database connection pool status',
    labelNames: ['state'], // total, idle, waiting
});

const dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation'], // select, insert, update, delete
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
});

// ─── Cache Metrics ─────────────────────────────────────────────

const cacheOperationsTotal = new client.Counter({
    name: 'cache_operations_total',
    help: 'Total cache operations',
    labelNames: ['operation', 'result'], // get/set, hit/miss
});

const cacheSizeGauge = new client.Gauge({
    name: 'cache_size_bytes',
    help: 'Current cache memory usage in bytes',
});

// ─── Register all metrics ──────────────────────────────────────

const allMetrics = [
    wsConnectionsGauge,
    wsMessagesTotal,
    wsErrorsTotal,
    fleetTrucksGauge,
    fleetDeliveriesTotal,
    fleetTemperatureGauge,
    fleetAlertsTotal,
    telemetryIngestionRate,
    telemetryIngestionDuration,
    telemetryBatchSize,
    dbPoolGauge,
    dbQueryDuration,
    cacheOperationsTotal,
    cacheSizeGauge,
];

for (const metric of allMetrics) {
    register.registerMetric(metric);
}

// ─── Utility Functions ─────────────────────────────────────────

/** Record a WebSocket message */
function recordWsMessage(direction) {
    wsMessagesTotal.inc({ direction });
}

/** Update active WebSocket connection count */
function setWsConnections(count) {
    wsConnectionsGauge.set(count);
}

/** Record a WebSocket error */
function recordWsError(type) {
    wsErrorsTotal.inc({ type });
}

/** Update fleet truck counts by status */
function updateFleetCounts(counts) {
    for (const [status, count] of Object.entries(counts)) {
        fleetTrucksGauge.set({ status }, count);
    }
}

/** Record fleet temperature snapshot */
function updateFleetTemperature(avg, min, max) {
    fleetTemperatureGauge.set({ metric: 'avg' }, avg);
    fleetTemperatureGauge.set({ metric: 'min' }, min);
    fleetTemperatureGauge.set({ metric: 'max' }, max);
}

/** Record an alert */
function recordAlert(severity) {
    fleetAlertsTotal.inc({ severity });
}

/** Record telemetry batch ingestion */
function recordTelemetryIngestion(source, batchSize, durationSeconds) {
    telemetryIngestionRate.inc({ source }, batchSize);
    telemetryBatchSize.observe(batchSize);
    telemetryIngestionDuration.observe(durationSeconds);
}

/** Update db pool stats */
function updateDbPoolStats(total, idle, waiting) {
    dbPoolGauge.set({ state: 'total' }, total);
    dbPoolGauge.set({ state: 'idle' }, idle);
    dbPoolGauge.set({ state: 'waiting' }, waiting);
}

/** Record a database query duration */
function recordDbQuery(operation, durationSeconds) {
    dbQueryDuration.observe({ operation }, durationSeconds);
}

/** Record a cache operation */
function recordCacheOp(operation, result) {
    cacheOperationsTotal.inc({ operation, result });
}

module.exports = {
    // WebSocket
    recordWsMessage,
    setWsConnections,
    recordWsError,
    // Fleet
    updateFleetCounts,
    updateFleetTemperature,
    recordAlert,
    // Telemetry
    recordTelemetryIngestion,
    // Database
    updateDbPoolStats,
    recordDbQuery,
    // Cache
    recordCacheOp,
    cacheSizeGauge,
};
