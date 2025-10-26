import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('CORS on /health simple request', () => {
  it('GET /health with Origin sets ACAO', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://example.com' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
});
