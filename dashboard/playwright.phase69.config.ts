import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/routes-audit.light.spec.ts'],
    outputDir: './playwright-results/phase69',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 1,
    workers: 1,
    timeout: 45_000,
    expect: { timeout: 10_000 },
    reporter: [
        ['html', { outputFolder: 'playwright-report/phase69', open: 'never' }],
        ['line'],
    ],
    use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
    },
    webServer: {
        command: 'pnpm run start --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 180_000,
        env: { E2E_LIGHT: 'true', NEXT_PUBLIC_E2E_LIGHT: 'true', PORT: '3000' },
    },
})
