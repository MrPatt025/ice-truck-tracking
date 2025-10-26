/* eslint-env es2021 */

/* global __ENV */

// load-test.js — k6 scenarios for Ice Truck Tracking
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Trend, Rate, Counter } from 'k6/metrics';
import ws from 'k6/ws';

// ========= ENV =========
const BASE_URL = (__ENV && __ENV.BASE_URL) || 'http://localhost:5000';
const WS_URL =
  (__ENV && __ENV.WS_URL) ||
  BASE_URL.replace(/^http/i, 'ws') + ((__ENV && __ENV.WS_PATH) || '' || '');
const TEST_TYPE = (((__ENV && __ENV.TEST_TYPE) || 'smoke') + '').toLowerCase(); // smoke|load|soak

// ======= METRICS =======
const healthDur = new Trend('health_duration');
const rootDur = new Trend('root_duration');
const metricsDur = new Trend('metrics_duration');
const wsMsgCount = new Counter('ws_messages');
const wsConnectOK = new Rate('ws_connect_ok');
const errorRate = new Rate('errors');

// ======= OPTIONS =======
function chooseOptions() {
  if (TEST_TYPE === 'load') {
    return {
      scenarios: {
        http_ramp: {
          executor: 'ramping-arrival-rate',
          startRate: 10,
          timeUnit: '1s',
          preAllocatedVUs: 200,
          maxVUs: 1000,
          stages: [
            { target: 100, duration: '2m' },
            { target: 100, duration: '5m' },
            { target: 500, duration: '2m' },
            { target: 500, duration: '5m' },
            { target: 1000, duration: '2m' },
            { target: 1000, duration: '5m' },
            { target: 0, duration: '2m' },
          ],
          exec: 'httpFlow',
        },
        ws_soak: {
          executor: 'constant-vus',
          vus: 50,
          duration: '20m',
          exec: 'wsFlow',
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<300'],
        health_duration: ['p(95)<200'],
        root_duration: ['p(95)<200'],
        metrics_duration: ['p(95)<500'],
        ws_connect_ok: ['rate>0.95'],
        errors: ['rate<0.01'],
      },
    };
  }

  if (TEST_TYPE === 'soak') {
    return {
      scenarios: {
        http_const: {
          executor: 'constant-arrival-rate',
          rate: 50,
          timeUnit: '1s',
          duration: '30m',
          preAllocatedVUs: 100,
          maxVUs: 300,
          exec: 'httpFlow',
        },
        ws_const: {
          executor: 'constant-vus',
          vus: 25,
          duration: '30m',
          exec: 'wsFlow',
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.005'],
        http_req_duration: ['p(95)<250'],
        ws_connect_ok: ['rate>0.98'],
        errors: ['rate<0.005'],
      },
    };
  }

  // default smoke
  return {
    scenarios: {
      http_smoke: {
        executor: 'constant-vus',
        vus: 5,
        duration: '1m',
        exec: 'httpFlow',
      },
      ws_smoke: {
        executor: 'constant-vus',
        vus: 2,
        duration: '1m',
        exec: 'wsFlow',
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<300'],
      ws_connect_ok: ['rate>0.9'],
      errors: ['rate<0.01'],
    },
  };
}

export const options = chooseOptions();

// ===== SETUP/TEARDOWN =====
export function setup() {
  console.log(`k6 start type=${TEST_TYPE} base=${BASE_URL} ws=${WS_URL}`);

  // best-effort warmup/seed; ignore failures
  try {
    http.post(`${BASE_URL}/api/v1/alerts/clear`);
  } catch {
    // ignore
  }
  try {
    http.post(`${BASE_URL}/api/v1/trucks/test?count=3`);
  } catch {
    // ignore
  }

  const health = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { name: 'GET /api/v1/health' },
  });
  if (health.status !== 200)
    throw new Error(`Health check failed: ${health.status}`);
  return { startedAt: new Date().toISOString() };
}

export function teardown(data) {
  console.log(
    `k6 done startedAt=${data && data.startedAt ? data.startedAt : 'N/A'}`,
  );
}

// ========= HTTP =========
export function httpFlow() {
  // /api/v1/health
  const h = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { name: 'GET /api/v1/health' },
  });
  healthDur.add(h.timings.duration);
  check(h, {
    'health 200': (r) => r.status === 200,
    'health <200ms': (r) => r.timings.duration < 200,
    'health fields': (r) => {
      try {
        const b = JSON.parse(r.body || '{}');
        // ยอมรับ { ok:true } หรือรูปแบบ verbose
        return b.ok === true || (b.status === 'healthy' && 'timestamp' in b);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  // /
  const r = http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });
  rootDur.add(r.timings.duration);
  check(r, {
    'root 200': (x) => x.status === 200,
    'root <200ms': (x) => x.timings.duration < 200,
  }) || errorRate.add(1);

  // /metrics (ถ้าไม่มีให้ไม่ fail threshold รวม)
  const m = http.get(`${BASE_URL}/metrics`, { tags: { name: 'GET /metrics' } });
  metricsDur.add(m.timings.duration);
  if (m.status !== 404) {
    check(m, {
      'metrics ok': (x) => x.status === 200,
      'metrics <500ms': (x) => x.timings.duration < 500,
      'prom format': (x) => String(x.body || '').includes('# HELP'),
    }) || errorRate.add(1);
  }

  // batch
  const batch = http.batch([
    [
      'GET',
      `${BASE_URL}/api/v1/health`,
      null,
      { tags: { name: 'GET /api/v1/health' } },
    ],
    ['GET', `${BASE_URL}/`, null, { tags: { name: 'GET /' } }],
    ['GET', `${BASE_URL}/metrics`, null, { tags: { name: 'GET /metrics' } }],
  ]);
  for (let i = 0; i < batch.length; i += 1) {
    const resp = batch[i];
    const ok =
      resp.status === 200 &&
      resp.timings &&
      typeof resp.timings.duration === 'number'
        ? resp.timings.duration < 300
        : resp.status === 404; // ยอมรับ 404 ของ /metrics
    if (!ok) errorRate.add(1);
  }

  sleep(1);
}

// ======== WS =========
export function wsFlow() {
  const res = ws.connect(WS_URL, {}, (socket) => {
    let opened = false;

    socket.on('open', () => {
      opened = true;
      wsConnectOK.add(true);
      socket.setTimeout(() => socket.close(), 5000);
    });

    socket.on('message', () => wsMsgCount.add(1));

    socket.on('error', (e) => {
      console.error('WS error:', e);
      wsConnectOK.add(false);
    });

    socket.on('close', () => {
      if (!opened) wsConnectOK.add(false);
    });
  });

  if (res && res.error) {
    wsConnectOK.add(false);
    errorRate.add(1);
  }

  sleep(1);
}

// ===== SUMMARY =====
export function handleSummary(data) {
  const out = {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
  if (__ENV && __ENV.HTML === '1') {
    out['summary.html'] =
      `<html><head><meta charset="utf-8"><title>k6 Summary</title></head>` +
      `<body><pre>${textSummary(data, { indent: ' ', enableColors: false })}</pre></body></html>`;
  }
  return out;
}
