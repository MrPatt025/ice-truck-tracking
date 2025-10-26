import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildServer, type FastifyInstance } from '../src/index';
import * as userService from '../src/services/userService';

let app: FastifyInstance;
beforeAll(async () => {
  app = buildServer();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('auth login', () => {
  it('401 on invalid credentials', async () => {
    vi.spyOn(userService, 'login').mockResolvedValueOnce(null as any);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'x', password: 'y' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('200 with token on valid credentials', async () => {
    vi.spyOn(userService, 'login').mockResolvedValueOnce({
      id: 1,
      username: 'u',
      role: 'admin',
    } as any);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('token');
  });
});
