import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('trucks query order only', () => {
  it('defaults sort when only order=desc is provided', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?order=desc&page=1&limit=2',
    });
    expect(r.statusCode).toBe(200);
  });
});
