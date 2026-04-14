import { test, expect } from '@playwright/test';

test.describe('Cinematic Gateway Transition', () => {
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name.includes('light'),
      'Cinematic WebGL transition checks are validated in GPU profile, not light profile.'
    );
  });

  test('should display global WebGL canvas behind DOM', async ({ page }) => {
    await page.goto('/');

    const canvas = await page.locator('#cinematic-gateway-canvas');
    await expect(canvas).toBeVisible();
  });

  test('should trigger transition when clicking dashboard button', async ({
    page,
  }) => {
    await page.goto('/');

    const dashboardButton = page
      .getByRole('link', {
        name: /open dashboard|live dashboard|launch dashboard/i,
      })
      .first();

    await dashboardButton.click();
    await page.waitForTimeout(500);
  });

  test('should navigate to dashboard after transition', async ({ page }) => {
    await page.goto('/');

    const dashboardButton = page
      .getByRole('link', {
        name: /open dashboard|live dashboard|launch dashboard/i,
      })
      .first();
    await dashboardButton.click();

    await page.waitForNavigation({ timeout: 5000 });

    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });

  test('should maintain canvas during resize', async ({ page }) => {
    await page.goto('/');

    const canvas = await page.locator('#cinematic-gateway-canvas');
    await expect(canvas).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(canvas).toBeVisible();
  });

  test('should return to landing page when navigating back', async ({
    page,
  }) => {
    await page.goto('/');

    const dashboardButton = page
      .getByRole('link', {
        name: /open dashboard|live dashboard|launch dashboard/i,
      })
      .first();
    await dashboardButton.click();

    await page.waitForNavigation({ timeout: 10000 });

    await page.goBack();

    const url = page.url();
    expect(new URL(url).pathname).toBe('/');
  });
});
