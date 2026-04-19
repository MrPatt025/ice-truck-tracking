import { test, expect, type Page } from '@playwright/test';
import { setE2EAuthCookies } from './support/auth';

/* ================================================================
   Visual Regression Tests
   ─────────────────────────
   Pixel-level comparison using Playwright's toHaveScreenshot().
   Baselines are auto-generated on first run and stored in
   e2e/__screenshots__/.

   Update baselines:
     pnpm run test:e2e:visual -- --update-snapshots

   Profiles:
     • visual-desktop  — 1280×720, light mode
     • visual-mobile   — Pixel 7 viewport, light mode
     • visual-dark     — 1280×720, dark mode
   ================================================================ */

const HYDRATION_TIMEOUT = 20_000;

const waitForHydration = async (page: Page) => {
    await page.waitForTimeout(2_000);
};

/** Disable animations for deterministic screenshots */
const disableAnimations = async (page: Page) => {
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                transition: none !important;
                animation: none !important;
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `,
    });
};

// ───────────────────────────────────────────────────────────────
// Landing Page
// ───────────────────────────────────────────────────────────────
test.describe('Visual — Landing Page', () => {
    test('full page screenshot', async ({ page }) => {
        await page.goto('/');
        await waitForHydration(page);
        await disableAnimations(page);
        await expect(page).toHaveScreenshot('landing-full.png', {
            fullPage: true,
        });
    });

    test('above-the-fold viewport', async ({ page }) => {
        await page.goto('/');
        await waitForHydration(page);
        await disableAnimations(page);
        await expect(page).toHaveScreenshot('landing-viewport.png');
    });
});

// ───────────────────────────────────────────────────────────────
// Login Page
// ───────────────────────────────────────────────────────────────
test.describe('Visual — Login Page', () => {
    test('login form default state', async ({ page }) => {
        await page.goto('/login');
        await waitForHydration(page);
        await disableAnimations(page);
        await expect(page).toHaveScreenshot('login-default.png');
    });

    test('login form with validation errors', async ({ page }) => {
        await page.goto('/login');
        await waitForHydration(page);
        await disableAnimations(page);

        // Submit empty form to trigger validation
        const submitBtn = page.getByRole('button', { name: /sign in|log in|submit/i });
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(500);
        }

        await expect(page).toHaveScreenshot('login-validation.png');
    });
});

// ───────────────────────────────────────────────────────────────
// Dashboard Page
// ───────────────────────────────────────────────────────────────
test.describe('Visual — Dashboard', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setE2EAuthCookies(page, baseURL ?? 'http://localhost:3000');
    });

    test('dashboard full layout', async ({ page }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        await disableAnimations(page);

        // Wait for main content to render
        await page.locator('main').waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });

        await expect(page).toHaveScreenshot('dashboard-full.png', {
            fullPage: true,
        });
    });

    test('dashboard header region', async ({ page }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        await disableAnimations(page);

        const header = page.locator('header');
        await header.waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });

        await expect(header).toHaveScreenshot('dashboard-header.png');
    });

    test('dashboard metric cards region', async ({ page }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        await disableAnimations(page);

        // Target the grid area that holds metric/stat cards
        const grid = page.locator('[class*="grid"]').first();
        if (await grid.isVisible()) {
            await expect(grid).toHaveScreenshot('dashboard-metrics-grid.png');
        }
    });
});

// ───────────────────────────────────────────────────────────────
// Responsive Breakpoints
// ───────────────────────────────────────────────────────────────
test.describe('Visual — Responsive', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setE2EAuthCookies(page, baseURL ?? 'http://localhost:3000');
    });

    test('dashboard at tablet width (768px)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/dashboard');
        await waitForHydration(page);
        await disableAnimations(page);
        await page.locator('main').waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });

        await expect(page).toHaveScreenshot('dashboard-tablet.png', {
            fullPage: true,
        });
    });

    test('dashboard at narrow mobile (375px)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/dashboard');
        await waitForHydration(page);
        await disableAnimations(page);
        await page.locator('main').waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });

        await expect(page).toHaveScreenshot('dashboard-mobile-narrow.png', {
            fullPage: true,
        });
    });
});
