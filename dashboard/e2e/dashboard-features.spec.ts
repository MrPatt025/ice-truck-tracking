import { expect, test, type Page } from '@playwright/test';

const HYDRATION_TIMEOUT_MS = 20_000;

async function setAuthCookie(page: Page, baseURL: string): Promise<void> {
  const origin = new URL(baseURL);
  await page.context().addCookies([
    {
      name: 'access_token',
      value: 'e2e-test-token',
      domain: origin.hostname,
      path: '/',
      secure: origin.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

async function gotoDashboardWithRetry(page: Page): Promise<void> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
}

test.describe('Dashboard feature polish', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
    await gotoDashboardWithRetry(page);
    await expect(page.getByTestId('mission-control-surface')).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
  });

  test('toggles Live Fleet and Historical Heatmap modes', async ({ page }) => {
    const liveButton = page.getByTestId('map-mode-live');
    const historicalButton = page.getByTestId('map-mode-historical');

    await expect(liveButton).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
    await expect(historicalButton).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });

    await expect(liveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'false');

    await historicalButton.click({ force: true });
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'true');
    await expect(liveButton).toHaveAttribute('aria-pressed', 'false');

    await liveButton.click({ force: true });
    await expect(liveButton).toHaveAttribute('aria-pressed', 'true');
    await expect(historicalButton).toHaveAttribute('aria-pressed', 'false');
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
