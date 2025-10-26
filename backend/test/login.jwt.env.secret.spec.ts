import server from '../src/index';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const OLD = process.env.JWT_SECRET;

describe('login with JWT_SECRET in env', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-secret';
  });
  afterAll(() => {
    if (OLD === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = OLD;
  });

  it('POST /api/v1/auth/login -> 200 uses env secret branch', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'admin' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.token).toBeTypeOf('string');
  });
});
