import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer, type FastifyInstance } from '../src/index';

let app: FastifyInstance;
beforeAll(async () => {
  app = buildServer();
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
