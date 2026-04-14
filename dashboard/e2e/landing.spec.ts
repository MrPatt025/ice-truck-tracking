import { test, expect, type Page } from '@playwright/test';

/* ================================================================
   Landing Page — End-to-End Tests
   Covers: Navigation, Hero, Stats, Features, Tech Stack, CTA, Footer
   Platforms: Desktop (chromium) + Mobile (mobile-chrome)
   ================================================================ */

// --------------- helpers ---------------

/** Wait for Framer Motion animations to settle */
const waitForAnimations = (page: Page) => page.waitForTimeout(800);

/** The landing page uses Framer Motion — elements may render after hydration */
const HYDRATION_TIMEOUT = 15_000;

// ===============================================================
// 1. NAVIGATION BAR
// ===============================================================
test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('should display the brand logo and name', async ({ page }) => {
        const brand = page.locator('nav').getByText('Ice Truck');
        await expect(brand).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should show "Open Dashboard" link in navbar (desktop)', async ({
        page,
        isMobile,
    }) => {
        test.skip(!!isMobile, 'Nav CTA is hidden on mobile');
        // Exactly target the navbar button — avoids strict-mode violation
        const navDashboardLink = page
            .locator('nav')
            .getByRole('link', { name: 'Open Dashboard' });
        await expect(navDashboardLink).toBeVisible();
        await expect(navDashboardLink).toHaveAttribute('href', '/dashboard');
    });

    test('should contain Features, Performance and Tech Stack nav links (desktop)', async ({
        page,
        isMobile,
    }) => {
        test.skip(!!isMobile, 'Desktop-only nav links');
        for (const label of ['Features', 'Performance', 'Tech Stack']) {
            await expect(
                page.locator('nav').getByRole('link', { name: label }),
            ).toBeVisible();
        }
    });

    test('nav links should have correct href anchors', async ({
        page,
        isMobile,
    }) => {
        test.skip(!!isMobile, 'Desktop-only nav links');
        await expect(page.locator('nav a[href="#features"]')).toBeVisible();
        await expect(page.locator('nav a[href="#stats"]')).toBeVisible();
        await expect(page.locator('nav a[href="#tech"]')).toBeVisible();
    });

    test('navbar should be sticky and visible after scrolling', async ({
        page,
    }) => {
        await page.evaluate(() => window.scrollTo(0, 1200));
        await page.waitForTimeout(300);
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
        const box = await nav.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.y).toBeLessThanOrEqual(10);
    });
});

// ===============================================================
// 2. HERO SECTION
// ===============================================================
test.describe('Hero Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('should display the main heading (h1)', async ({ page }) => {
        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(h1).toContainText('Cold-Chain Mission Control');
    });

    test('should show gradient-highlighted text "Real-Time Fleet Command"', async ({
        page,
    }) => {
        await expect(page.getByText('Real-Time Fleet Command')).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('should display the hero subtitle', async ({ page }) => {
        await expect(
            page.getByText(/Track truck temperature, GPS, route health/i),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should show the mission telemetry badge', async ({ page }) => {
        await expect(page.getByText(/Command Grid Online/i)).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('should have a "Live Dashboard" CTA button linking to /dashboard', async ({
        page,
    }) => {
        const heroLink = page
            .locator('section')
            .getByRole('link', { name: /Live Dashboard/ });
        await expect(heroLink).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(heroLink).toHaveAttribute('href', '/dashboard');
    });

    test('should have a visible "Login" CTA linking to /dashboard', async ({
        page,
    }) => {
        const loginLink = page
            .locator('section')
            .getByRole('link', { name: /^Login$/ });
        await expect(loginLink).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(loginLink).toHaveAttribute('href', '/dashboard');
    });
});

// ===============================================================
// 3. STATS SECTION
// ===============================================================
test.describe('Stats Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('should display all four stat values', async ({ page }) => {
        const statsSection = page.locator('#stats');
        await expect(statsSection).toBeVisible({ timeout: HYDRATION_TIMEOUT });

        for (const value of ['99.9%', '<200ms', '10M+', '24/7']) {
            await expect(statsSection.getByText(value)).toBeVisible();
        }
    });

    test('should show stat labels', async ({ page }) => {
        const statsSection = page.locator('#stats');
        for (const label of [
            'Uptime SLA',
            'Telemetry Latency',
            'Data Points / Day',
            'Monitoring',
        ]) {
            await expect(statsSection.getByText(label)).toBeVisible();
        }
    });
});

// ===============================================================
// 4. FEATURES SECTION  (FIX: use #features selector, not hasText)
// ===============================================================
test.describe('Features Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('should display the features section heading', async ({ page }) => {
        const section = page.locator('section#features');
        await expect(section).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(
            section.getByRole('heading', { name: /Everything You Need for Cold-Chain IoT/ }),
        ).toBeVisible();
    });

    test('should render all 6 feature cards', async ({ page }) => {
        const featureTitles = [
            'Real-Time GPS Tracking',
            'Temperature Monitoring',
            'Instant Alerts',
            'Role-Based Access',
            'Analytics Dashboard',
            'IoT-First Architecture',
        ];

        for (const title of featureTitles) {
            await expect(
                page.locator('section#features').getByText(title),
            ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        }
    });

    test('each feature card should have a description', async ({ page }) => {
        const featureDescriptions = [
            /sub-second MQTT updates/i,
            /TimescaleDB stores millions of temperature readings/i,
            /threshold alerts pushed to dashboard & mobile/i,
            /Granular RBAC/i,
            /shadcn\/ui components/i,
            /Eclipse Mosquitto MQTT/i,
        ];

        for (const desc of featureDescriptions) {
            await expect(
                page.locator('section#features').getByText(desc),
            ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        }
    });
});

// ===============================================================
// 5. TECH STACK SECTION
// ===============================================================
test.describe('Tech Stack Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('should display the tech stack heading', async ({ page }) => {
        const section = page.locator('#tech');
        await expect(section).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(section.getByRole('heading')).toContainText(
            'Built with Modern Open-Source Tech',
        );
    });

    test('should list core technologies', async ({ page }) => {
        const techSection = page.locator('#tech');
        const techs = [
            'Next.js 15',
            'React 18',
            'TypeScript',
            'Tailwind CSS',
            'shadcn/ui',
            'Framer Motion',
            'PostgreSQL',
            'TimescaleDB',
            'Redis',
            'MQTT',
            'Socket.IO',
            'Playwright',
        ];

        for (const tech of techs) {
            await expect(
                techSection.getByText(tech).first(),
            ).toBeVisible();
        }
    });
});

// ===============================================================
// 6. CALL-TO-ACTION (CTA) SECTION
// ===============================================================
test.describe('CTA Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
      await waitForAnimations(page);
  });

    test('should display "Ready to Track?" heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: /Ready to Track/i }),
        ).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    });

    test('should have a "Launch Dashboard" button', async ({ page }) => {
        const ctaLink = page.getByRole('link', { name: /Launch Dashboard/ });
        await expect(ctaLink).toBeVisible({ timeout: HYDRATION_TIMEOUT });
        await expect(ctaLink).toHaveAttribute('href', '/dashboard');
    });

    test('should mention Docker Compose in CTA description', async ({
        page,
    }) => {
        await expect(page.getByText(/Docker Compose/)).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });
});

// ===============================================================
// 7. FOOTER
// ===============================================================
test.describe('Footer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display copyright with current year', async ({ page }) => {
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
        const year = new Date().getFullYear().toString();
        await expect(footer).toContainText(year);
        await expect(footer).toContainText('Ice Truck Tracking');
    });

    test('should include GitHub link in footer', async ({ page }) => {
        const ghFooterLink = page.locator('footer a[href*="github"]');
        await expect(ghFooterLink).toBeVisible();
    });
});

// ===============================================================
// 8. RESPONSIVE BEHAVIOUR
// ===============================================================
test.describe('Responsive Design', () => {
    test('hero heading should be visible at 375×812 (iPhone SE)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await waitForAnimations(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
          timeout: HYDRATION_TIMEOUT,
      });
  });

    test('hero heading should be visible at 768×1024 (iPad)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await waitForAnimations(page);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
            timeout: HYDRATION_TIMEOUT,
        });
    });

    test('features section should be visible on all viewports', async ({
        page,
    }) => {
        for (const vp of [
            { width: 375, height: 812 },
            { width: 768, height: 1024 },
            { width: 1440, height: 900 },
        ]) {
            await page.setViewportSize(vp);
            await page.goto('/');
            await waitForAnimations(page);
            await expect(page.locator('section#features')).toBeVisible({
                timeout: HYDRATION_TIMEOUT,
            });
        }
    });
});

// ===============================================================
// 9. ACCESSIBILITY BASICS
// ===============================================================
test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAnimations(page);
    });

    test('page should have <html lang="en">', async ({ page }) => {
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBe('en');
    });

    test('page should have exactly one h1', async ({ page }) => {
        const headings = page.getByRole('heading', { level: 1 });
        await expect(headings).toHaveCount(1);
    });

    test('all images should load without errors', async ({ page }) => {
        const brokenImages = await page.evaluate(() =>
            Array.from(document.querySelectorAll('img')).filter(
                (img) => !img.complete || img.naturalWidth === 0,
            ).length,
        );
        expect(brokenImages).toBe(0);
    });

    test('page title should contain "Ice Truck"', async ({ page }) => {
        await expect(page).toHaveTitle(/Ice Truck/i);
    });
});

// ===============================================================
// 10. NAVIGATION FLOW
// ===============================================================
test.describe('Navigation Flow', () => {
    test('"Open Dashboard" link should navigate toward /dashboard', async ({
        page,
        baseURL,
    }) => {
        // Set auth cookie so the middleware lets us through to /dashboard
        await page.context().addCookies([
            {
                name: 'access_token',
                value: 'e2e-test-token',
                url: baseURL ?? 'http://localhost:3000',
            },
        ]);

        await page.goto('/');
        await waitForAnimations(page);
        const navLink = page
            .locator('nav')
            .getByRole('link', { name: 'Open Dashboard' });

        // On mobile the nav link is hidden — use hero CTA instead
        const navVisible = await navLink.isVisible();
        if (navVisible) {
            await navLink.click();
        } else {
            const heroLink = page
                .getByRole('link', { name: /Live Dashboard/ })
                .first();
            await heroLink.click();
        }

        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('without auth cookie, dashboard link should redirect to /login', async ({
        page,
    }) => {
        await page.goto('/');
        await waitForAnimations(page);
        const navLink = page
            .locator('nav')
            .getByRole('link', { name: 'Open Dashboard' });

        const navVisible3 = await navLink.isVisible();
        if (navVisible3) {
            await navLink.click();
        } else {
            const heroLink = page
                .getByRole('link', { name: /Live Dashboard/ })
                .first();
            await heroLink.click();
        }

        // Should be redirected to /login by the auth middleware
        await expect(page).toHaveURL(/\/login/);
    });
});
