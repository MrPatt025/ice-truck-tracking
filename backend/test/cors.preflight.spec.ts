import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('preflight', () => {
  it('OPTIONS /api/v1/trucks -> 200/204', async () => {
    const r = await server.inject({
      method: 'OPTIONS',
      url: '/api/v1/trucks',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });
    expect([200, 204]).toContain(r.statusCode);
  });
});
