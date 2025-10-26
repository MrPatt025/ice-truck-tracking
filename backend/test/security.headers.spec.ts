import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/index';

describe('helmet + cors', () => {
  const server = buildServer({ logger: false });

  it('helmet sets common security headers', async () => {
    const r = await server.inject({ method: 'GET', url: '/health' });
    // ตรวจสอบตัวอย่าง header ที่ helmet ใส่ให้
    expect(r.headers['x-dns-prefetch-control']).toBeDefined();
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('CORS preflight returns 200/204', async () => {
    const r = await server.inject({
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
