import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 1000 },  // Stay at 1000 VUs
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

const BASE_URL = 'http://localhost:5000';

export default function () {
  // Test 1: Health Check
  let response = http.get(`${BASE_URL}/api/v1/health`);
  check(response, {
    'health check status 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  // Test 2: Authentication
  const authPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  response = http.post(`${BASE_URL}/api/v1/auth/login`, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'auth status 200 or 401': (r) => [200, 401].includes(r.status),
  }) || errorRate.add(1);

  // Test 3: Location Tracking
  const locationPayload = JSON.stringify({
    truckId: `truck-${Math.floor(Math.random() * 100)}`,
    latitude: 13.7563 + (Math.random() - 0.5) * 0.1,
    longitude: 100.5018 + (Math.random() - 0.5) * 0.1,
    timestamp: new Date().toISOString()
  });
  
  response = http.post(`${BASE_URL}/api/v1/tracking/location`, locationPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'location tracking status 200': (r) => r.status === 200,
    'location response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  // Test 4: Get Trucks
  response = http.get(`${BASE_URL}/api/v1/tracking/trucks`);
  check(response, {
    'get trucks status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}