// backend/test/stats.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, type FastifyInstance } from '../src/index';

describe('GET /api/v1/stats', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await app({
      enableDocs: false,
      enableRateLimit: false,
      forTest: true,
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns 200 and expected keys', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/stats?range=24h',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('revenueSeries');
    expect(body).toHaveProperty('fleetSeries');
    expect(body).toHaveProperty('alertsSeries');
    expect(body).toHaveProperty('tempBuckets');
    expect(body).toHaveProperty('performanceRadar');
    expect(body).toHaveProperty('lastCalc');
  });
});
