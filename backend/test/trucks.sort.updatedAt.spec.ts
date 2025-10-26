import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('trucks sort=updatedAt branch', () => {
  it('GET /api/v1/trucks?sort=updatedAt&order=asc -> 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/trucks?sort=updatedAt&order=asc&page=1&limit=5',
    });
    expect(r.statusCode).toBe(200);
  });
});
