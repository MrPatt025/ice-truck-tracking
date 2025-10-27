import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

describe('singleton app responds', () => {
  beforeAll(async () => {
    await registerPlugins();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /health 200', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
  });

  it('GET /api/v1/health 200', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(r.statusCode).toBe(200);
  });
});
