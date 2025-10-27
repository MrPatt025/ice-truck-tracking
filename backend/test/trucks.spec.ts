// backend/test/trucks.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

beforeAll(async () => {
  await registerPlugins();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('trucks', () => {
  it('list (GET /api/v1/trucks) returns array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trucks?page=1&limit=2&sort=name&order=asc',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('name');
    }
  });

  it('create unique name (POST /api/v1/trucks) -> 201', async () => {
    const uniqueName = `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: { name: uniqueName },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(uniqueName);
  });
});
