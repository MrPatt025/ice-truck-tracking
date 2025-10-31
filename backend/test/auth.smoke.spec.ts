import { describe, it, expect, beforeAll } from 'vitest';
import server, { registerPlugins } from '../src/index';

function getSetCookie(h: Record<string, unknown>): string[] {
  const sc = (h['set-cookie'] ?? h['set-Cookie']) as unknown;
  if (!sc) return [];
  if (Array.isArray(sc)) return sc as string[];
  return [String(sc)];
}

describe('auth smoke', () => {
  beforeAll(async () => {
    await registerPlugins();
    await server.ready();
  });

  it('POST /api/v1/auth/register -> 201 + Set-Cookie', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'newuser', password: 'password1' },
    });
    expect(res.statusCode).toBe(201);
    const sc = getSetCookie(res.headers as any);
    expect(sc.some((c) => /auth_token=/.test(c))).toBe(true);
  });

  it('POST /api/v1/auth/login -> 200 + Set-Cookie + token', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'password' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token?: string; accessToken?: string };
    expect(body.token || body.accessToken).toBeTruthy();
    const sc = getSetCookie(res.headers as any);
    expect(sc.some((c) => /auth_token=/.test(c))).toBe(true);
  });

  it('GET /api/v1/auth/me with cookie -> 200 user', async () => {
    const login = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'password' },
    });
    const cookies = getSetCookie(login.headers as any);
    const cookieHeader = cookies.join('; ');
    const me = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Cookie: cookieHeader },
    });
    expect(me.statusCode).toBe(200);
    const user = me.json() as { id?: number; username?: string };
    expect(user.username).toBeTruthy();
  });
});
