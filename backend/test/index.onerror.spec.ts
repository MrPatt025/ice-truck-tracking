import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/index';

describe('global error handler branch', () => {
  it('throws inside route -> 500', async () => {
    const app = buildServer({ logger: false });
    app.get('/__boom__', async () => {
      throw new Error('boom');
    });
    const r = await app.inject({ method: 'GET', url: '/__boom__' });
    expect(r.statusCode).toBe(500);
    await app.close();
  });
});
