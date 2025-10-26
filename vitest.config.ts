// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // Faster than jsdom
    setupFiles: ['./backend/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/.eslintrc.cjs',
      ],
    },
  },
});
