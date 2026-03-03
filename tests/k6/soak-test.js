import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Soak Test — 2-hour sustained load to detect memory leaks, connection pool exhaustion.
 * Run: k6 run tests/k6/soak-test.js --env BASE_URL=http://localhost:5000
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
    stages: [
        { duration: '5m', target: 50 },
        { duration: '1h50m', target: 50 },
        { duration: '5m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<800'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const res = http.get(`${BASE_URL}/api/v1/health`);
    check(res, { 'soak health 200': (r) => r.status === 200 });
    sleep(2);

    const trucks = http.get(`${BASE_URL}/api/v1/trucks`);
    check(trucks, { 'soak trucks 200': (r) => r.status === 200 });
    sleep(2);
}
