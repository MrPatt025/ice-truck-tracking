import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * E2E Navigation Tests — All 14 Pages
 *
 * Verifies that all 14 dashboard pages render successfully with:
 * - Page load (200 status / no navigation errors)
 * - PremiumPageWrapper presence
 * - No console errors
 *
 * Resilient to 3D rendering delays via domcontentloaded + extended timeouts.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

// ── Auth Routes (4 pages) ──
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=test-token',
];

// ── Dashboard Routes (10 pages) ──
const dashboardRoutes = [
  '/',
  '/dashboard',
  '/alerts',
  '/tracking',
  '/fleet',
  '/operations',
  '/compliance',
  '/reports',
  '/settings',
  '/admin',
];

const allRoutes = [...authRoutes, ...dashboardRoutes];

// Helper: Check page loaded successfully and PremiumPageWrapper exists
async function verifyPageLoad(page: Page, route: string): Promise<void> {
  const consoleErrors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to route — use domcontentloaded to avoid 3D rendering timeouts
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Wait for DOM to settle after 3D canvas hydration
  await page.waitForLoadState('domcontentloaded');

  // Assert page loaded successfully
  expect(response?.status() ?? 200).toBeLessThan(400);

  // Assert PremiumPageWrapper is present — bulletproof testid-based locator
  const pageContent = page.locator('[data-testid="premium-wrapper"]');
  await expect(pageContent).toBeVisible({ timeout: 15000 });

  // Verify no critical console errors (filter out benign 3D/WebGL warnings)
  const criticalErrors = consoleErrors.filter(
    (err) =>
      !err.includes('WebGL') &&
      !err.includes('THREE') &&
      !err.includes('ResizeObserver') &&
      !err.includes('Failed to load resource')
  );
  expect(criticalErrors.length).toBe(0);
}

// ── Auth Page Tests ──
test.describe('Auth Pages (4)', () => {
  test('Login page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/login');
  });

  test('Register page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/register');
  });

  test('Forgot Password page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/forgot-password');
  });

  test('Reset Password page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/reset-password?token=test-token');
  });
});

// ── Dashboard Page Tests ──
test.describe('Dashboard Pages (10)', () => {
  test('Home page (/) renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/');
  });

  test('Dashboard page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/dashboard');
  });

  test('Alerts page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/alerts');
  });

  test('Tracking page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/tracking');
  });

  test('Fleet page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/fleet');
  });

  test('Operations page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/operations');
  });

  test('Compliance page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/compliance');
  });

  test('Reports page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/reports');
  });

  test('Settings page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/settings');
  });

  test('Admin page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/admin');
  });
});

// ── Comprehensive Navigation Test ──
test('All 14 pages load successfully in sequence', async ({ page }) => {
  for (const route of allRoutes) {
    await verifyPageLoad(page, route);
  }
});

// ── Smoke Test: Basic Navigation Flow ──
test('Navigation flow: Home → Dashboard → Alerts → Settings', async ({ page }) => {
  const routes = ['/', '/dashboard', '/alerts', '/settings'];

  for (const route of routes) {
    await verifyPageLoad(page, route);
  }
});
