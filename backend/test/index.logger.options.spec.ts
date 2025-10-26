import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/index';

describe('buildServer logger options branches', () => {
  it('logger=false branch', async () => {
    const app = buildServer({ logger: false });
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('logger=true branch', async () => {
    const app = buildServer({ logger: true });
    const r = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
