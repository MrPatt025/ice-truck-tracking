import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'], // Error rate must be less than 1%
    errors: ['rate<0.01'],
  },
}

// Base URL
const BASE_URL = 'http://localhost:5000'

export default function () {
  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/v1/health`)
  check(healthResponse, {
    'health check status is 200': r => r.status === 200,
    'health check response time < 200ms': r => r.timings.duration < 200,
    'health check has required fields': r => {
      const body = JSON.parse(r.body)
      return (
        body.status === 'healthy' &&
        body.timestamp &&
        body.uptime &&
        body.version
      )
    },
  })

  // Root endpoint
  const rootResponse = http.get(`${BASE_URL}/`)
  check(rootResponse, {
    'root endpoint status is 200': r => r.status === 200,
    'root endpoint response time < 200ms': r => r.timings.duration < 200,
  })

  // Metrics endpoint
  const metricsResponse = http.get(`${BASE_URL}/metrics`)
  check(metricsResponse, {
    'metrics endpoint status is 200': r => r.status === 200,
    'metrics endpoint response time < 500ms': r => r.timings.duration < 500,
    'metrics endpoint returns prometheus format': r =>
      r.body.includes('# HELP'),
  })

  // Simulate WebSocket connection (HTTP upgrade)
  const wsHeaders = {
    Upgrade: 'websocket',
    Connection: 'Upgrade',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version': '13',
  }

  const wsResponse = http.get(`${BASE_URL}/socket.io/`, { headers: wsHeaders })
  check(wsResponse, {
    'websocket upgrade status is 101 or 200': r =>
      r.status === 101 || r.status === 200,
  })

  // Simulate concurrent requests
  const concurrentRequests = [
    { url: `${BASE_URL}/api/v1/health`, method: 'GET' },
    { url: `${BASE_URL}/`, method: 'GET' },
    { url: `${BASE_URL}/metrics`, method: 'GET' },
  ]

  const responses = http.batch(concurrentRequests)

  responses.forEach((response, index) => {
    check(response, {
      [`concurrent request ${index + 1} status is 200`]: r => r.status === 200,
      [`concurrent request ${index + 1} response time < 300ms`]: r =>
        r.timings.duration < 300,
    })
  })

  // Error tracking
  if (healthResponse.status !== 200 || rootResponse.status !== 200) {
    errorRate.add(1)
  }

  // Think time between requests
  sleep(1)
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting load test for Ice Truck Tracking API')

  // Verify the API is accessible before starting the test
  const healthCheck = http.get(`${BASE_URL}/api/v1/health`)
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed with status ${healthCheck.status}`)
  }

  console.log('API health check passed, starting load test...')
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed')
  console.log(`Final error rate: ${errorRate.value}`)
}
