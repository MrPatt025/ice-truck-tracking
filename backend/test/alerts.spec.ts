import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

beforeAll(async () => {
  await registerPlugins();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('alerts', () => {
  it('GET /api/v1/alerts returns array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/alerts' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
