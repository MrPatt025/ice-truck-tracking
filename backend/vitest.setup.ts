// backend/vitest.setup.ts
import { beforeAll, afterAll } from 'vitest';

const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  FASTIFY_LOG_LEVEL: process.env.FASTIFY_LOG_LEVEL,
  TZ: process.env.TZ,
};

beforeAll(() => {
  // โหมดทดสอบและลด noise จาก logger
  process.env.NODE_ENV ??= 'test';
  process.env.FASTIFY_LOG_LEVEL ??= 'fatal';
  process.env.TZ ??= 'UTC';

  const noop = () => {};

  // ลด log ระดับ debug/info ระหว่างทดสอบ
  console.debug = noop;
  console.info = noop;

  // กรอง error ที่ตั้งใจให้เกิดในเคสทดสอบ
  console.error = (...args: unknown[]) => {
    const s = args
      .map((a) =>
        a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : String(a),
      )
      .join(' ');

    if (
      s.includes('Unique constraint failed') || // Prisma P2002
      s.includes('P2002') ||
      s.includes('boom') || // generic-500 tests
      s.includes('BadRequestError') || // body invalid
      s.includes('body must be object') // parser/zod
    ) {
      return;
    }
    originalConsole.error(...(args as Parameters<typeof console.error>));
  };
});

afterAll(() => {
  // คืน console เดิม
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  // คืนค่า env เดิม
  if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.NODE_ENV;

  if (originalEnv.FASTIFY_LOG_LEVEL === undefined)
    delete process.env.FASTIFY_LOG_LEVEL;
  else process.env.FASTIFY_LOG_LEVEL = originalEnv.FASTIFY_LOG_LEVEL;

  if (originalEnv.TZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalEnv.TZ;
});
