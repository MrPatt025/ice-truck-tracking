import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display hero section', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should have navigation links', async ({ page }) => {
        // Multiple links contain "dashboard" (Open Dashboard, Live Dashboard, Launch Dashboard)
        // Use .first() to avoid Playwright strict-mode violation
        const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
        await expect(dashboardLink).toBeVisible();
    });

    test('should display feature cards', async ({ page }) => {
        // The features section is identified by id="features", not by visible text
        const featureSection = page.locator('#features');
        await expect(featureSection).toBeVisible();
    });

    test('should be responsive', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
});
