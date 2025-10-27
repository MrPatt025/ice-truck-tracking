import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

describe('helmet + cors', () => {
  beforeAll(async () => {
    await registerPlugins();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('helmet sets common security headers', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    // ตรวจสอบตัวอย่าง header ที่ helmet ใส่ให้
    expect(r.headers['x-dns-prefetch-control']).toBeDefined();
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('CORS preflight returns 200/204', async () => {
    const r = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/trucks',
      headers: {
        origin: 'http://example.com',
        'access-control-request-method': 'POST',
      },
    });
    expect([200, 204]).toContain(r.statusCode);
  });
});
