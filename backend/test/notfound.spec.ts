import { describe, it, expect } from 'vitest';
import server from '../src/index';
describe('not found', () => {
  it('GET /__missing__ -> 404', async () => {
    const r = await server.inject({ method: 'GET', url: '/__missing__' });
    expect(r.statusCode).toBe(404);
  });
});
