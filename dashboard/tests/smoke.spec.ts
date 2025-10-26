import { test, expect } from '@playwright/test';

test('smoke', async ({ page }) => {
  // Use Playwright baseURL from config for stability
  await page.goto('/');
  expect(true).toBeTruthy();
});
