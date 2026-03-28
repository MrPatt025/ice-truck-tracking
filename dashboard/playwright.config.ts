import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    outputDir: './playwright-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : 2,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        launchOptions: {
            args: ['--force-prefers-reduced-motion'],
        },
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
    ],
    webServer: {
        command: 'pnpm run build && (node .next/standalone/dashboard/server.js || node .next/standalone/server.js)',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
    },
});
