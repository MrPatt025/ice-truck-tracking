import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display hero section', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should have navigation links', async ({ page }) => {
        const dashboardLink = page.getByRole('link', { name: /dashboard/i });
        await expect(dashboardLink).toBeVisible();
    });

    test('should display feature cards', async ({ page }) => {
        const featureSection = page.locator('section').filter({ hasText: /features/i });
        await expect(featureSection).toBeVisible();
    });

    test('should be responsive', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
});
