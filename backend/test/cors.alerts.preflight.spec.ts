import { beforeAll, afterAll, test, expect } from 'vitest';
import serverDefault from '../src/index';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = serverDefault;
});
afterAll(async () => {
  /* no-op */
});

test('preflight > OPTIONS /api/v1/alerts -> 200/204 with CORS headers', async () => {
  const res = await app.inject({
    method: 'OPTIONS',
    url: '/api/v1/alerts',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'GET',
    },
  });
  expect([200, 204]).toContain(res.statusCode);
  // เปิดกว้างไว้ตามที่ตั้งค่าไว้ใน dev
  expect(res.headers['access-control-allow-origin']).toBe(
    'http://localhost:3000',
  );
});
