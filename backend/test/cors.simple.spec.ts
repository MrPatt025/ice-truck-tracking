import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('CORS simple request', () => {
  it('GET /api/v1/trucks returns CORS headers when Origin present', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?page=1&limit=1',
      headers: { origin: 'http://example.com' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });
});
