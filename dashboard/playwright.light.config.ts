/**
 * Playwright — LIGHT profile (no WebGL, no 3D)
 *
 * Runs on every PR. Tests navigation, forms, API integration,
 * responsive layout — everything EXCEPT GPU/3D features.
 *
 * Env: E2E_LIGHT=true → conditional 3D bootstrap is disabled.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/*.spec.ts', '**/*.light.spec.ts'],
    testIgnore: ['**/*.gpu.spec.ts'],
    outputDir: './playwright-results/light',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 2 : 4,
    timeout: 45_000,
    expect: { timeout: 10_000 },
    reporter: [
        ['html', { outputFolder: 'playwright-report/light', open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:5000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
    },
    projects: [
        {
            name: 'light-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'light-mobile',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'light-firefox',
            use: { ...devices['Desktop Firefox'] },
        },
    ],
    webServer: {
        command: 'cross-env E2E_LIGHT=true pnpm run dev',
        url: 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { E2E_LIGHT: 'true' },
    },
});
