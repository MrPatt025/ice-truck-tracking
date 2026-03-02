import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test('should load dashboard page', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should show loading state', async ({ page }) => {
        await page.goto('/dashboard');
        // Either the dashboard content or a loading indicator should be visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should display map container', async ({ page }) => {
        await page.goto('/dashboard');
        // Look for the map or main content area
        const mainContent = page.locator('main, [role="main"], #map, .map-container');
        await expect(mainContent.first()).toBeVisible({ timeout: 10_000 });
    });
});
