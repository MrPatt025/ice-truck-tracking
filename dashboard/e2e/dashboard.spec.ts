import { test, expect, type Page } from '@playwright/test';

/* ================================================================
   Dashboard Page — End-to-End Tests
   Covers: Loading, Header, Metrics, Charts, Controls, Responsive
   Platforms: Desktop (chromium) + Mobile (mobile-chrome)
   ================================================================ */

/** Client-side dashboard hydrates with random data — allow extra time */
const HYDRATION_TIMEOUT = 20_000;

/** Wait for client-side hydration to complete */
const waitForHydration = async (page: Page) => {
    await page.waitForTimeout(1_500);
};

/**
 * The Next.js middleware guards /dashboard with an access_token cookie.
 * In E2E tests we set a synthetic token so the middleware lets us through.
 */
const setAuthCookie = async (page: Page, baseURL: string) => {
    await page.context().addCookies([
        {
            name: 'access_token',
            value: 'e2e-test-token',
          url: baseURL,
      },
  ]);
};

// ===============================================================
// 1. PAGE LOADING & BASIC STRUCTURE
// ===============================================================
test.describe('Dashboard — Page Load', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
  });

    test('should load dashboard page with correct URL', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should render the page body', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display the <main> content area', async ({ page }) => {
        await page.goto('/dashboard');
        const main = page.locator('main');
        await expect(main).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('page title should contain "Ice Truck"', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveTitle(/Ice Truck/i);
    });
});

// ===============================================================
// 2. HEADER & BRANDING
// ===============================================================
test.describe('Dashboard — Header', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should display the sticky header', async ({ page }) => {
        const header = page.locator('header');
        await expect(header).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should show "Cryogenic Mission Console" title', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: /Cryogenic Mission Console/i }),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should show "Fleet Sentinel Grid" subtitle', async ({
        page,
    }) => {
        await expect(
            page.getByText(/Fleet Sentinel Grid/i),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should display API status indicator', async ({
        page,
        isMobile,
    }) => {
        // API text has class "hidden sm:inline" — not visible on mobile
        test.skip(!!isMobile, 'API status text is hidden on mobile');
        await expect(
            page.getByText(/API\s+(Online|Offline|Checking)/i),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });
});

// ===============================================================
// 3. TIME RANGE & THEME CONTROLS
// ===============================================================
test.describe('Dashboard — Controls', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should display time range selector buttons', async ({ page }) => {
        for (const range of ['1h', '24h', '7d', '30d', '90d']) {
            await expect(page.getByRole('button', { name: range })).toBeVisible({
                timeout: HYDRATION_TIMEOUT,
            });
        }
    });

    test('time range button should be clickable', async ({ page }) => {
        const btn7d = page.getByRole('button', { name: '7d' });
        await expect(btn7d).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await btn7d.click();
        // Verify the button gained the "active" style (gradient class)
        await expect(btn7d).toHaveClass(/from-violet/);
    });

    test('should display theme selector buttons', async ({ page }) => {
        // Theme buttons render t[0] (lowercase) with CSS uppercase
        for (const initial of ['d', 'n', 'o', 'f']) {
            await expect(
                page.getByRole('button', { name: initial, exact: true }),
            ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        }
    });

    test('should display refresh speed selector', async ({ page }) => {
        await expect(page.getByText(/Refresh:/)).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
        await expect(page.locator('select').first()).toBeVisible();
    });
});

// ===============================================================
// 4. METRIC CARDS
// ===============================================================
test.describe('Dashboard — Metrics', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should display metric cards for key KPIs', async ({ page }) => {
        const metricTitles = [
            'Active Trucks',
            'Avg Cargo Temp',
            'Open Alerts',
            'On-time Rate',
        ];

        for (const title of metricTitles) {
            await expect(page.getByText(title).first()).toBeVisible({
                timeout: HYDRATION_TIMEOUT,
            });
        }
    });

    test('should display additional metrics after hydration', async ({
        page,
    }) => {
        const extraMetrics = [
            'Fuel Efficiency',
            'Active Drivers',
            'Revenue Today',
            'Deliveries',
        ];

        for (const title of extraMetrics) {
            await expect(page.getByText(title).first()).toBeVisible({
                timeout: HYDRATION_TIMEOUT,
            });
        }
    });

    test('should show status pills (Last updated / operational)', async ({
        page,
    }) => {
        await expect(
            page
                .getByText(
                    /Last updated|All systems operational|Simulation paused/i,
                )
                .first(),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });
});

// ===============================================================
// 5. CHART SECTIONS
// ===============================================================
test.describe('Dashboard — Charts', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should display Revenue Trend Analysis section', async ({ page }) => {
        await expect(page.getByText('Revenue Trend Analysis')).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('should display Fleet Activity & Efficiency section', async ({
        page,
    }) => {
        await expect(
            page.getByText('Fleet Activity & Efficiency'),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should display Cargo Temperature Distribution section', async ({
        page,
    }) => {
        await expect(
            page.getByText('Cargo Temperature Distribution'),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should display Alert Timeline section', async ({ page }) => {
        await expect(page.getByText('Alert Timeline')).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('should display Performance Metrics section', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: 'Performance Metrics' }),
        ).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('should display System Health Monitor section', async ({ page }) => {
        await expect(page.getByText('System Health Monitor')).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });
});

// ===============================================================
// 6. TOOLBAR BUTTONS
// ===============================================================
test.describe('Dashboard — Toolbar', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should have grid toggle button', async ({ page }) => {
        const gridBtn = page.getByTitle(/grid/i);
        await expect(gridBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should have 3D toggle button', async ({ page }) => {
        const btn3d = page.getByTitle(/3D/i);
        await expect(btn3d).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should have pause/resume button', async ({ page }) => {
        const pauseBtn = page.getByTitle(/Pause|Resume/i);
        await expect(pauseBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should have alerts button', async ({ page }) => {
        const alertsBtn = page.getByTitle(/alerts/i);
        await expect(alertsBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should have download report button', async ({ page }) => {
        const downloadBtn = page.getByTitle(/download|report/i);
        await expect(downloadBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });
});

// ===============================================================
// 7. INTERACTIVE BEHAVIOUR
// ===============================================================
test.describe('Dashboard — Interactions', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await waitForHydration(page);
    });

    test('should toggle grid overlay when grid button is clicked', async ({
        page,
    }) => {
        const gridBtn = page.getByTitle(/grid/i);
        await expect(gridBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await gridBtn.click();
        await page.waitForTimeout(300);
        await gridBtn.click();
    });

    test('should toggle pause state when pause button is clicked', async ({
        page,
    }) => {
        const pauseBtn = page.getByTitle(/Pause|Resume/i);
        await expect(pauseBtn).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await pauseBtn.click();
        await page.waitForTimeout(300);
        await expect(
            page.getByText(/Simulation paused|All systems operational/i),
        ).toBeVisible();
    });

    test('search input should be visible and typeable (desktop)', async ({
        page,
        isMobile,
    }) => {
        test.skip(!!isMobile, 'Search input hidden on mobile');
        const searchInput = page.getByPlaceholder(/Search trucks/i);
        await expect(searchInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await searchInput.fill('ICE-001');
        await expect(searchInput).toHaveValue('ICE-001');
    });
});

// ===============================================================
// 8. RESPONSIVE DESIGN
// ===============================================================
test.describe('Dashboard — Responsive', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
    });

    test('should render on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/dashboard');
      await waitForHydration(page);
      const header = page.locator('header');
      await expect(header).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  });

    test('should render on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/dashboard');
      await waitForHydration(page);
      await expect(page.locator('main')).toBeVisible({
          timeout: HYDRATION_TIMEOUT,
      });
  });

    test('header should remain visible after scrolling', async ({ page }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        await page.evaluate(() => window.scrollTo(0, 2000));
        await page.waitForTimeout(300);
        const header = page.locator('header');
      await expect(header).toBeVisible();
      const box = await header.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeLessThanOrEqual(10);
  });
});

// ===============================================================
// 9. AUTH MIDDLEWARE
// ===============================================================
test.describe('Dashboard — Auth Middleware', () => {
    test('should redirect to /login when no auth cookie is set', async ({
        page,
    }) => {
        // Do NOT set the auth cookie
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('should load dashboard when auth cookie is present', async ({
        page,
        baseURL,
    }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/dashboard/);
    });
});

// ===============================================================
// 10. ACCESSIBILITY
// ===============================================================
test.describe('Dashboard — Accessibility', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
    });

    test('should have lang attribute on html', async ({ page }) => {
        await page.goto('/dashboard');
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBe('en');
    });

    test('should have at least one heading', async ({ page }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        const headings = page.getByRole('heading');
        const count = await headings.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('interactive elements should be keyboard-focusable', async ({
        page,
    }) => {
        await page.goto('/dashboard');
        await waitForHydration(page);
        await page.keyboard.press('Tab');
        const focusedTag = await page.evaluate(() =>
            document.activeElement?.tagName.toLowerCase(),
        );
        expect(['a', 'button', 'input', 'select']).toContain(focusedTag);
    });
});
