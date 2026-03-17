/**
 * Playwright — GPU profile (full WebGL + 3D)
 *
 * Runs nightly or on-demand. Tests GPU rendering, WebGL context
 * recovery, Three.js scenes, map visualization, and GPU memory.
 *
 * Requires: --channel=chrome (real GPU), or headless with swiftshader.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/*.gpu.spec.ts'],
    outputDir: './playwright-results/gpu',
    fullyParallel: false, // GPU tests are sequential to avoid OOM
    forbidOnly: !!process.env.CI,
    retries: 1,
    workers: 1, // Single worker — GPU resource contention
    timeout: 120_000,
    expect: { timeout: 30_000 },
    reporter: [
        ['html', { outputFolder: 'playwright-report/gpu', open: 'never' }],
        ['list'],
        ['json', { outputFile: 'playwright-report/gpu/results.json' }],
    ],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'on',
        video: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 60_000,
        launchOptions: {
            args: [
                '--enable-webgl',
                '--use-gl=angle',
                '--enable-features=Vulkan',
                '--ignore-gpu-blocklist',
            ],
        },
    },
    projects: [
        {
            name: 'gpu-chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
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
