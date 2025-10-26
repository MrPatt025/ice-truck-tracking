// test/index.app.spec.ts
import { describe, it, expect } from 'vitest';
import server, { app } from '../src/index';

describe('app() init path', () => {
  it('creates a Fastify instance and responds /health', async () => {
    const s = await app();
    const r = await s.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
  });
});
