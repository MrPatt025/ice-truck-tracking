import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

beforeAll(async () => {
  await registerPlugins();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('health', () => {
  it('GET /health 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
