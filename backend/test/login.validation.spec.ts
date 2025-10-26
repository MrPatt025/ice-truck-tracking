import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('login validation', () => {
  it('rejects empty body -> 400', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });
    expect(r.statusCode).toBe(400);
  });

  it('rejects wrong types -> 400', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 123, password: true },
    });
    expect(r.statusCode).toBe(400);
  });
});
