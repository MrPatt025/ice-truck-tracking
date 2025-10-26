import { describe, it, expect } from 'vitest';
import server from '../src/index';

const url = '/api/v1/auth/login';

describe('login jwt secret branches', () => {
  it('fallback secret when JWT_SECRET is undefined', async () => {
    const old = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const r = await server.inject({
      method: 'POST',
      url,
      payload: { username: 'admin', password: 'password' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(typeof body.token).toBe('string');

    if (old !== undefined) process.env.JWT_SECRET = old;
  });

  it('use custom JWT_SECRET when defined', async () => {
    const old = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'custom-secret';

    const r = await server.inject({
      method: 'POST',
      url,
      payload: { username: 'admin', password: 'password' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(typeof body.token).toBe('string');

    if (old === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = old;
  });
});
