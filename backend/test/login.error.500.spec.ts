import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../src/index';

vi.mock('../src/services/userService', () => ({
  login: vi.fn(() => {
    throw new Error('boom');
  }),
}));

describe('login route 500', () => {
  it('POST /api/v1/auth/login -> 500 when service throws', async () => {
    const server = buildServer({ logger: false });
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });
    expect(r.statusCode).toBe(500);
  });
});
