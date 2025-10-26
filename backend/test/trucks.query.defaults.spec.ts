import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('trucks query defaults', () => {
  it('omit sort/order -> 200 via default branch', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?page=1&limit=2',
    });
    expect(r.statusCode).toBe(200);
  });
});
