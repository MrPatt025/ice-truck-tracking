import { expect, test, type Page } from '@playwright/test';
import { setE2EAuthCookies } from './support/auth';

const HYDRATION_TIMEOUT_MS = 20_000;

async function gotoDashboardWithRetry(page: Page): Promise<void> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForSelector('body', { timeout: 10_000 });
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await page.waitForTimeout(2_000);
    }
  }
}


test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    // Suppress internal 3D/Motion warnings from 3rd party libs
    const text = msg.text();
    if (text.includes('THREE.') || text.includes('non-static position') || text.includes('Reduced Motion')) return;
  });
  await page.route('**/api/v1/**', route => route.fulfill({ status: 200, json: { data: [], status: 'success', meta: { total: 0 } } }));
});

test.describe('Dashboard feature polish', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await setE2EAuthCookies(page, baseURL ?? 'http://localhost:3000');
    await gotoDashboardWithRetry(page);
    await expect(page.getByTestId('mission-control-surface')).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
  });

  test('toggles Live Fleet and Historical Heatmap modes', async ({ page }) => {
    // Wait for stability before interacting with complex UI
    await page.waitForTimeout(2000);

    const liveButton = page.getByTestId('map-mode-live');
    const historicalButton = page.getByTestId('map-mode-historical');

    await expect(liveButton).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
    await expect(historicalButton).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });

    await expect(liveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'false');

    // Force clicks to bypass any potential transparent overlays from 3D canvas placeholders
    await historicalButton.click({ force: true });
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
    await expect(liveButton).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 });

    await liveButton.click({ force: true });
    await expect(liveButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 });
  });

  test('shows offline fallback banner when browser goes offline', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      globalThis.dispatchEvent(new Event('offline'));
    });

    await expect
      .poll(async () => page.evaluate(() => globalThis.navigator.onLine), {
        timeout: HYDRATION_TIMEOUT_MS,
      })
      .toBe(false);

    const offlineIndicator = page.getByTestId('offline-indicator');

    await expect(offlineIndicator).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
    await expect(offlineIndicator).toContainText('Offline mode enabled');
    await expect(offlineIndicator).toContainText('graceful fallback mode');

    await page.evaluate(() => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      globalThis.dispatchEvent(new Event('online'));
    });

    await expect
      .poll(async () => page.evaluate(() => globalThis.navigator.onLine), {
        timeout: HYDRATION_TIMEOUT_MS,
      })
      .toBe(true);
  });
});
