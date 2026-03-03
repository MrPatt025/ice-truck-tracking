/* eslint-disable no-undef */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/* ─── Custom Metrics ─── */
const errorRate = new Rate('errors');
const latencyP95 = new Trend('latency_p95', true);
const reqCount = new Counter('total_requests');

/* ─── Test Configuration ─── */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
    stages: [
        // Ramp-up
        { duration: '30s', target: 50 },   // warm-up to 50 VUs
        { duration: '1m', target: 100 },   // ramp to 100 VUs
        // Sustained load
        { duration: '3m', target: 100 },   // hold at 100 VUs
        // Spike test
        { duration: '30s', target: 300 },  // spike to 300 VUs
        { duration: '1m', target: 300 },   // hold spike
        // Ramp-down
        { duration: '30s', target: 50 },   // scale down
        { duration: '30s', target: 0 },    // graceful shutdown
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1500'],  // 95th < 500ms, 99th < 1.5s
        errors: ['rate<0.05'],                             // error rate < 5%
        http_req_failed: ['rate<0.01'],                    // failed requests < 1%
        'http_req_duration{name:health}': ['p(95)<100'],   // health check < 100ms
        'http_req_duration{name:trucks}': ['p(95)<300'],   // trucks list < 300ms
        'http_req_duration{name:telemetry}': ['p(95)<200'],// telemetry write < 200ms
    },
    // Output to Prometheus
    ext: {
        loadimpact: {
            projectID: __ENV.K6_PROJECT_ID || undefined,
        },
    },
};

/* ─── Authentication ─── */
export function setup() {
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: __ENV.TEST_EMAIL || 'admin@icetruck.com',
        password: __ENV.TEST_PASSWORD || 'admin123',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (loginRes.status === 200) {
        const body = JSON.parse(loginRes.body);
        return { token: body.token || body.accessToken };
    }

    // Fallback: no auth for health endpoints
    return { token: '' };
}

/* ─── Scenarios ─── */
export default function vuFunction(data) { // NOSONAR — k6 VU function receives setup() data
    const headers = {
        'Content-Type': 'application/json',
        ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
    };

    group('Health Check', () => {
        const res = http.get(`${BASE_URL}/api/v1/health`, {
            tags: { name: 'health' },
        });
        const healthCheck = check(res, {
            'health status 200': (r) => r.status === 200,
            'health body OK': (r) => {
                try { return JSON.parse(r.body).status === 'ok'; } catch { return false; }
            },
        });
        if (!healthCheck) errorRate.add(1);
        reqCount.add(1);
        latencyP95.add(res.timings.duration);
    });

    sleep(0.5);

    group('List Trucks', () => {
        const res = http.get(`${BASE_URL}/api/v1/trucks`, {
            headers,
            tags: { name: 'trucks' },
        });
        const trucksCheck = check(res, {
            'trucks status 200': (r) => r.status === 200,
            'trucks is array': (r) => {
                try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
            },
        });
        if (!trucksCheck) errorRate.add(1);
        reqCount.add(1);
        latencyP95.add(res.timings.duration);
    });

    sleep(0.5);

    group('List Alerts', () => {
        const res = http.get(`${BASE_URL}/api/v1/alerts`, {
            headers,
            tags: { name: 'alerts' },
        });
        const alertsCheck = check(res, {
            'alerts status 2xx': (r) => r.status >= 200 && r.status < 300,
        });
        if (!alertsCheck) errorRate.add(1);
        reqCount.add(1);
        latencyP95.add(res.timings.duration);
    });

    sleep(0.5);

    // Simulate telemetry ingestion (POST)
    group('Telemetry Ingestion', () => {
        const payload = JSON.stringify({
            truck_id: `truck-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
            latitude: 13.7563 + (Math.random() - 0.5) * 0.02,
            longitude: 100.5018 + (Math.random() - 0.5) * 0.02,
            speed: Math.round(Math.random() * 60),
            temperature: -10 + Math.random() * 5,
            timestamp: new Date().toISOString(),
        });

        const res = http.post(`${BASE_URL}/api/v1/telemetry`, payload, {
            headers,
            tags: { name: 'telemetry' },
        });
        const telemetryCheck = check(res, {
            'telemetry status 2xx': (r) => r.status >= 200 && r.status < 300,
        });
        if (!telemetryCheck) errorRate.add(1);
        reqCount.add(1);
        latencyP95.add(res.timings.duration);
    });

    sleep(1);
}

export function handleSummary(data) { // NOSONAR — k6 lifecycle function
    return {
        'stdout': textSummary(data, { indent: '  ', enableColors: true }),
        'reports/k6-summary.json': JSON.stringify(data, null, 2),
    };
}

function textSummary(data, _opts) { // NOSONAR
    // Minimal summary fallback (k6 provides built-in textSummary)
    return JSON.stringify(data.metrics, null, 2);
}
