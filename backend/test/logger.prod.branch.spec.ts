import { beforeEach, afterEach, test, expect } from 'vitest';

// ใช้ buildServer เพื่อไม่ไปยุ่ง start()
import { buildServer } from '../src/index';

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV, NODE_ENV: 'production' };
});

afterEach(async () => {
  process.env = OLD_ENV;
});

test('buildServer ใช้กิ่ง logger โหมด production และ route ทำงาน', async () => {
  const app = buildServer(); // ครอบกิ่ง isProd === true
  const res = await app.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  await app.close();
});
