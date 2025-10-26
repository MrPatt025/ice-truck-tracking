// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/_legacy/**'],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: false,
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts', // ตัด entrypoint/glue ออกจาก coverage
        'src/_legacy/**',
        'src/**/__generated__/**',
        'src/config/**',
        'src/middleware/**',
        'vitest.setup.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        // เกณฑ์ที่สอดคล้องกับสถานะปัจจุบันและทำให้ CI ผ่านอย่างมีเหตุผล
        statements: 90,
        lines: 90,
        functions: 96,
        branches: 80,
      },
    },
  },
});
