// test/trucks.query.order.only.spec.ts
import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { buildServer } from '../src/index';
import type { FastifyInstance } from 'fastify';

type Truck = { name: string };

describe('trucks query order-only uses default sort=name', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('order=desc without sort => default sort=name with desc order', async () => {
    const name1 = `T-${Date.now()}-A`;
    const name2 = `T-${Date.now()}-Z`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: { name: name1 },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: { name: name2 },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trucks?order=desc&page=1&limit=50',
    });
    expect(res.statusCode).toBe(200);

    const data = res.json() as Truck[];
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].name >= data[i].name).toBe(true);
    }
  });
});
