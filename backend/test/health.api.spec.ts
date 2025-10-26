import { test, expect } from 'vitest';
import server from '../src/index';

test('GET /api/v1/health -> { ok: true }', async () => {
  const res = await server.inject({ method: 'GET', url: '/api/v1/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ ok: true });
});
