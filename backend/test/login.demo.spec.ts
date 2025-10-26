// backend/test/login.demo.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/index';

const BASE_ENV = { ...process.env };
let app: ReturnType<typeof buildServer> | null = null;

async function closeApp() {
  if (app) {
    await app.close();
    app = null;
  }
}

describe('login DEMO branches', () => {
  beforeEach(() => {
    process.env = { ...BASE_ENV };
  });

  afterEach(async () => {
    await closeApp();
  });

  it('DEMO enabled + valid creds -> 200', async () => {
    process.env.DEMO_LOGIN = 'true'; // ใช้ค่าที่โค้ดรองรับแน่นอน
    process.env.DEMO_CREDS = JSON.stringify({
      username: 'demo',
      password: 'pass',
    });

    app = buildServer({ logger: false });
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'demo', password: 'pass' },
    });

    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.username).toBe('demo');
  });

  it('DEMO enabled + invalid DEMO_CREDS JSON -> 401 (fallback ปกติ)', async () => {
    process.env.DEMO_LOGIN = 'true';
    process.env.DEMO_CREDS = '{invalid';

    app = buildServer({ logger: false });
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'demo', password: 'pass' },
    });

    expect(r.statusCode).toBe(401);
  });

  it('DEMO disabled -> 401', async () => {
    delete process.env.DEMO_LOGIN;

    app = buildServer({ logger: false });
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'demo', password: 'pass' },
    });

    expect(r.statusCode).toBe(401);
  });
});
