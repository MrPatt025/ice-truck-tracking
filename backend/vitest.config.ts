import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/_legacy/**'],

    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    allowOnly: false,

    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,

    // ให้โค้ดรู้ว่าอยู่ในโหมดเทสเสมอ (ป้องกัน process.exit ระหว่างเทส ฯลฯ)
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
    },

    // ลด noise จาก Prisma error log ที่ถูก “คาดหมาย” ในเทส
    onConsoleLog(log, type) {
      if (type === 'stdout' && /prisma:error/i.test(log)) return false;
      return undefined;
    },

    // ถ้าเจอปัญหา SQLite locked จากการรันไฟล์ขนาน ให้เปิดบรรทัดล่าง
    // poolOptions: { threads: { singleThread: true } },

    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts', // entrypoint/glue
        'src/_legacy/**',
        'src/**/__generated__/**',
        'src/config/**',
        'src/middleware/**',
        'src/plugins/**', // ปลั๊กอิน/แอดออน ไม่ใช่ยูนิตหลัก
        'src/lib/prisma.ts', // bootstrap/wrapper ของ Prisma
        'vitest.setup.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 87,
        lines: 87,
        functions: 87,
        branches: 78,
      },
    },
  },
});
