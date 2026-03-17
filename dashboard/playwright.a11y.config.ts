/**
 * Playwright — A11Y (Accessibility) Profile
 *
 * Runs accessibility audits against all main pages.
 * Uses axe-core via @axe-core/playwright for WCAG 2.1 AA compliance.
 *
 * Run: npx playwright test --config=playwright.a11y.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/*.a11y.spec.ts'],
    outputDir: './playwright-results/a11y',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 1 : 2,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: [
        ['html', { outputFolder: 'playwright-report/a11y', open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        trace: 'off',
        screenshot: 'only-on-failure',
        video: 'off',
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
    },
    projects: [
        {
            name: 'a11y-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'a11y-mobile',
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
