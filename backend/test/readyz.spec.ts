import { describe, it, expect } from 'vitest';
import server from '../src/index';
describe('ready', () => {
  it('GET /readyz 200', async () => {
    const res = await server.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ready).toBe(true);
  });
});
