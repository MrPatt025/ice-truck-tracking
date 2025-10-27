import { beforeEach, afterEach, test, expect } from 'vitest';
import { app, registerPlugins } from '../src/index';

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV, NODE_ENV: 'production' };
});

afterEach(async () => {
  process.env = OLD_ENV;
});

test('app responds in production env', async () => {
  await registerPlugins();
  await app.ready();
  const res = await app.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  await app.close();
});
