/**
 * Playwright — LIGHT profile (no WebGL, no 3D)
 *
 * Runs on every PR. Tests navigation, forms, API integration,
 * responsive layout — everything EXCEPT GPU/3D features.
 *
 * Env: E2E_LIGHT=true → conditional 3D bootstrap is disabled.
 */
import { defineConfig, devices } from '@playwright/test'

process.env.PLAYWRIGHT_BYPASS_AUTH = 'true'

// Explicit CI detection (expect CI='true' in CI environments)
const isCI = process.env.CI === 'true'
const lightUseConfig = {
  baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'reduce',
  launchOptions: {
    args: ['--force-prefers-reduced-motion'],
  },
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  actionTimeout: isCI ? 20_000 : 15_000,
  navigationTimeout: isCI ? 60_000 : 30_000,
} as unknown as NonNullable<Parameters<typeof defineConfig>[0]['use']>

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.spec.ts', '**/*.light.spec.ts'],
  testIgnore: isCI
    ? [
        '**/*.gpu.spec.ts',
        '**/*.visual.spec.ts',
        '**/*.a11y.spec.ts',
        '**/chaos-network.spec.ts',
        '**/dashboard.spec.ts',
        '**/dashboard-features.spec.ts',
        '**/cinematic-gateway.spec.ts',
      ]
    : [
        '**/*.gpu.spec.ts',
        '**/*.visual.spec.ts',
        '**/*.a11y.spec.ts',
        '**/chaos-network.spec.ts',
      ],
  outputDir: './playwright-results/light',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: isCI ? 60_000 : 120_000,
  expect: { timeout: isCI ? 20_000 : 30_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report/light', open: 'never' }],
    ['list'],
  ],
  use: lightUseConfig,
  projects: [
    {
      name: 'light-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'pnpm run build && node scripts/start-standalone.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 1_200_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      E2E_LIGHT: 'true',
      NEXT_PUBLIC_E2E_LIGHT: 'true',
      PLAYWRIGHT_BYPASS_AUTH: 'true',
      PORT: '3000',
      NODE_OPTIONS: '--max_old_space_size=4096',
      // Suppress noisy Node deprecation warnings in CI/light runs so test logs stay focused
      NODE_NO_WARNINGS: '1',
      // Ensure non-interactive build on Windows and disable Next telemetry prompts
      CI: '1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
