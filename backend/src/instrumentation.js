/**
 * OpenTelemetry Instrumentation — auto-instrument Express, pg, ioredis, HTTP.
 * Load BEFORE any other imports via: node --require ./src/instrumentation.js index.js
 *
 * Exports traces to OTLP endpoint (Jaeger, Grafana Tempo, etc.)
 */

'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Debug logging in development only
if (process.env.OTEL_LOG_LEVEL === 'debug') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
    resource: new Resource({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'ice-truck-backend',
        [ATTR_SERVICE_VERSION]: '2.0.0',
        'deployment.environment': process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
        url: `${OTLP_ENDPOINT}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: `${OTLP_ENDPOINT}/v1/metrics`,
        }),
        exportIntervalMillis: 15_000, // export every 15s
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            // Auto-instrument Express, pg, ioredis, HTTP, net, dns
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-pg': {
                enabled: true,
                enhancedDatabaseReporting: true,
            },
            '@opentelemetry/instrumentation-ioredis': { enabled: true },
            '@opentelemetry/instrumentation-http': {
                enabled: true,
                // Ignore health-check noise
                ignoreIncomingRequestHook: (req) =>
                    req.url === '/api/v1/health' || req.url === '/metrics',
            },
            '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
            '@opentelemetry/instrumentation-dns': { enabled: false },
        }),
    ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('[OTel] SDK shut down'))
        .catch((err) => console.error('[OTel] Shutdown error', err));
});

module.exports = { sdk };
