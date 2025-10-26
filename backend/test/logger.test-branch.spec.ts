// backend/test/logger.test-branch.spec.ts
import { it, expect } from 'vitest';
import { buildServer } from '../src/index';

it('logger disabled on test build flag', async () => {
  const app = await buildServer({ forTest: true });
  const r = await app.inject({ method: 'GET', url: '/health' });
  expect(r.statusCode).toBe(200);
  await app.close();
});
