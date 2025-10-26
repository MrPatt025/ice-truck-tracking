import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('default export is Fastify instance', () => {
  it('responds on /health', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
  });
});
