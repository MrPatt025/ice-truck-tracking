import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

vi.mock('../src/services/userService', () => ({
  login: vi.fn(() => {
    throw new Error('boom');
  }),
}));

describe('login route 500', () => {
  beforeAll(async () => {
    await registerPlugins();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login -> 500 when service throws', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });
    expect(r.statusCode).toBe(500);
  });
});
