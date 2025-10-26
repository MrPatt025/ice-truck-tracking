import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('login validation single field missing', () => {
  it('missing username -> 400', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { password: 'x' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('missing password -> 400', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'x' },
    });
    expect(r.statusCode).toBe(400);
  });
});
