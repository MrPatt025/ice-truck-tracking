/**
 * Tests for Enhanced Observability Metrics
 */
const { register } = require('../../src/middleware/metrics');

// Require the module under test — registers metrics on shared registry
const {
    recordWsMessage,
    setWsConnections,
    recordWsError,
    updateFleetCounts,
    updateFleetTemperature,
    recordAlert,
    recordTelemetryIngestion,
    updateDbPoolStats,
    recordCacheOp,
} = require('../../src/middleware/observability');

afterEach(async () => {
    // reset counters between tests
    register.resetMetrics();
});

describe('Observability Metrics', () => {
    it('should register all custom metrics on the shared registry', async () => {
        const metrics = await register.getMetricsAsJSON();
        const names = metrics.map(m => m.name);

        expect(names).toContain('websocket_connections_active');
        expect(names).toContain('websocket_messages_total');
        expect(names).toContain('websocket_errors_total');
        expect(names).toContain('fleet_trucks_total');
        expect(names).toContain('fleet_alerts_total');
        expect(names).toContain('telemetry_ingestion_total');
        expect(names).toContain('db_pool_connections');
        expect(names).toContain('cache_operations_total');
    });

    it('setWsConnections updates gauge', async () => {
        setWsConnections(5);
        const metrics = await register.getMetricsAsJSON();
        const ws = metrics.find(m => m.name === 'websocket_connections_active');
        expect(ws.values[0].value).toBe(5);
    });

    it('recordWsMessage increments counter', async () => {
        recordWsMessage('outbound');
        recordWsMessage('outbound');
        recordWsMessage('inbound');

        const metrics = await register.getMetricsAsJSON();
        const msg = metrics.find(m => m.name === 'websocket_messages_total');
        const outbound = msg.values.find(v => v.labels.direction === 'outbound');
        expect(outbound.value).toBe(2);
    });

    it('recordWsError increments counter', async () => {
        recordWsError('socket');
        const metrics = await register.getMetricsAsJSON();
        const err = metrics.find(m => m.name === 'websocket_errors_total');
        expect(err.values[0].value).toBe(1);
    });

    it('updateFleetCounts sets gauges by status', async () => {
        updateFleetCounts({ active: 10, idle: 3, offline: 2 });
        const metrics = await register.getMetricsAsJSON();
        const trucks = metrics.find(m => m.name === 'fleet_trucks_total');
        const active = trucks.values.find(v => v.labels.status === 'active');
        expect(active.value).toBe(10);
    });

    it('updateFleetTemperature sets avg/min/max', async () => {
        updateFleetTemperature(-8, -18, -2);
        const metrics = await register.getMetricsAsJSON();
        const temp = metrics.find(m => m.name === 'fleet_temperature_celsius');
        const avg = temp.values.find(v => v.labels.metric === 'avg');
        expect(avg.value).toBe(-8);
    });

    it('recordAlert increments by severity', async () => {
        recordAlert('critical');
        recordAlert('warning');
        recordAlert('critical');
        const metrics = await register.getMetricsAsJSON();
        const alerts = metrics.find(m => m.name === 'fleet_alerts_total');
        const critical = alerts.values.find(v => v.labels.severity === 'critical');
        expect(critical.value).toBe(2);
    });

    it('recordTelemetryIngestion tracks counter and histograms', async () => {
        recordTelemetryIngestion('mqtt', 5, 0.015);
        const metrics = await register.getMetricsAsJSON();
        const rate = metrics.find(m => m.name === 'telemetry_ingestion_total');
        expect(rate.values.find(v => v.labels.source === 'mqtt').value).toBe(5);
    });

    it('updateDbPoolStats sets pool gauges', async () => {
        updateDbPoolStats(10, 7, 1);
        const metrics = await register.getMetricsAsJSON();
        const pool = metrics.find(m => m.name === 'db_pool_connections');
        expect(pool.values.find(v => v.labels.state === 'idle').value).toBe(7);
    });

    it('recordCacheOp increments by operation+result', async () => {
        recordCacheOp('get', 'hit');
        recordCacheOp('get', 'miss');
        recordCacheOp('get', 'hit');
        const metrics = await register.getMetricsAsJSON();
        const cache = metrics.find(m => m.name === 'cache_operations_total');
        const hits = cache.values.find(v => v.labels.operation === 'get' && v.labels.result === 'hit');
        expect(hits.value).toBe(2);
    });
});
