// dashboard/e2e/telemetry-refresh.spec.ts
import { test, expect } from '@playwright/test';

// Use cookie-based auth to pass middleware quickly if E2E creds are not present
test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await context.addCookies([
    {
      name: 'authToken',
      value: 'e2e-dummy',
      url: page.url() || 'http://localhost/',
      path: '/',
      httpOnly: false,
    },
  ]);
});

// Changing telemetry rate updates the dashboard KPI detail and keeps map mounted
test('changing telemetry rate reflects in UI and map stays mounted', async ({
  page,
}) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  // Map should be present
  const map = page.locator('[data-testid="map-container"]');
  await expect(map).toBeVisible();
  const mapHandle1 = await map.elementHandle();

  // Check KPI detail shows default Normal interval
  const detailBefore = page.getByText(/Telemetry Rate:\s*\d+s/i);
  await expect(detailBefore).toBeVisible();

  // Change telemetry refresh speed to Fast
  await page.getByLabel('Refresh speed').selectOption('fast');

  // Detail should update to 5s
  await expect(page.getByText(/Telemetry Rate:\s*5s/i)).toBeVisible();

  // Map element remains the same node
  const mapHandle2 = await map.elementHandle();
  const sameNode = await page.evaluate(
    (a, b) => a === b || a?.isSameNode?.(b) || false,
    mapHandle1,
    mapHandle2,
  );
  expect(sameNode).toBeTruthy();
});
