// backend/test/logger.test-branch.spec.ts
import { it, expect, beforeAll, afterAll } from 'vitest';
import { app, registerPlugins } from '../src/index';

beforeAll(async () => {
  await registerPlugins();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

it('responds on /health under test env', async () => {
  const r = await app.inject({ method: 'GET', url: '/health' });
  expect(r.statusCode).toBe(200);
});
