import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('trucks query validation', () => {
  it('invalid page/limit/order -> 400', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?page=0&limit=-1&order=foo',
    });
    expect(r.statusCode).toBe(400);
  });
});
