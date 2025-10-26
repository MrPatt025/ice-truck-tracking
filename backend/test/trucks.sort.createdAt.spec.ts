import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('trucks sort=createdAt branch', () => {
  it('GET /api/v1/trucks?sort=createdAt&order=asc -> 200', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?sort=createdAt&order=asc&page=1&limit=2',
    });
    expect(r.statusCode).toBe(200);
  });
});
