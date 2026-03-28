import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Test Profile
 * ─────────────────────────────────
 * Uses Playwright's toHaveScreenshot() for pixel-level comparison.
 *
 * Baselines live in e2e/__screenshots__/ (auto-generated on first run).
 * Update baselines: pnpm run test:e2e:visual -- --update-snapshots
 */
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.visual.spec.ts',
    outputDir: './playwright-results/visual',
    snapshotDir: './e2e/__screenshots__',
    snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{projectName}/{arg}{ext}',

    fullyParallel: false, // serial for deterministic screenshots
    forbidOnly: !!process.env.CI,
    retries: 0, // no retries — flaky screenshots should be investigated
    workers: 1,
    timeout: 60_000,

    expect: {
        timeout: 15_000,
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,  // allow 1% diff for antialiasing
            threshold: 0.2,           // per-pixel color threshold
            animations: 'disabled',   // freeze animations for determinism
        },
    },

    reporter: [
        ['html', { outputFolder: 'playwright-report/visual', open: 'never' }],
        ['list'],
    ],

    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        launchOptions: {
            args: ['--force-prefers-reduced-motion'],
        },
        trace: 'off',
        screenshot: 'off', // we take our own
        video: 'off',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
    },

    projects: [
        {
            name: 'visual-desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
                colorScheme: 'light',
            },
        },
        {
            name: 'visual-mobile',
            use: {
                ...devices['Pixel 7'],
                colorScheme: 'light',
            },
        },
        {
            name: 'visual-dark',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
                colorScheme: 'dark',
            },
        },
    ],

    webServer: {
        command: 'pnpm run build && (node .next/standalone/dashboard/server.js || node .next/standalone/server.js)',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
    },
});
