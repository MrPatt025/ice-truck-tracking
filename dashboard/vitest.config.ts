// dashboard/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost' },
    },
    setupFiles: ['./vitest.setup.ts'],
    css: true, // allow importing css in components
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'e2e',
      '.next',
      'dist',
      'coverage',
      '.storybook',
      '**/*.stories.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: path.join(dirname, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.stories.*',
        '**/__mocks__/**',
        '**/stories/**',
        'src/stories/**',
      ],
    },

    // Run Storybook stories in a dedicated browser project
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
          include: ['src/**/*.stories.@(js|jsx|ts|tsx)'],
          exclude: ['node_modules'],
        },
      },
    ],
  },
});
