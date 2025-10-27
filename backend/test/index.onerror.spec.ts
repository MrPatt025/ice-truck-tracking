import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

describe('global error handler branch', () => {
  beforeAll(async () => {
    await registerPlugins();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });
  it('throws inside route -> 500', async () => {
    app.get('/__boom__', async () => {
      throw new Error('boom');
    });
    const r = await app.inject({ method: 'GET', url: '/__boom__' });
    expect(r.statusCode).toBe(500);
  });
});
