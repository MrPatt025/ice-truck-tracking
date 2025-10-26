import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('trucks query asc branch', () => {
  it('GET /trucks with order=asc triggers asc branch', async () => {
    const r = await server.inject({
      method: 'GET',
      url: '/api/v1/trucks?page=1&limit=2&sort=name&order=asc',
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(Array.isArray(body.items) || Array.isArray(body)).toBe(true);
  });
});
