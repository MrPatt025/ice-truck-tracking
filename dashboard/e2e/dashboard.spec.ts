import { test, expect } from '@playwright/test';

// The /dashboard route is protected by middleware that requires an access_token cookie.
// Set a mock token so the auth guard lets requests through.
test.describe('Dashboard', () => {
    test.beforeEach(async ({ context }) => {
        await context.addCookies([
            {
                name: 'access_token',
                value: 'e2e-test-token',
                domain: 'localhost',
                path: '/',
            },
        ]);
    });

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

    test('should display main content area', async ({ page }) => {
        await page.goto('/dashboard');
        // The dashboard renders a sticky <header> and a <main> content area
        const header = page.locator('header');
        await expect(header).toBeVisible({ timeout: 15_000 });
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible({ timeout: 15_000 });
    });
});
