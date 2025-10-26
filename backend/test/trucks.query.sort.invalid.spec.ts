import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('trucks query invalid sort', () => {
  it('sort invalid -> 400', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?sort=__bad__&order=asc&page=1&limit=2',
    });
    expect(r.statusCode).toBe(400);
  });
});
