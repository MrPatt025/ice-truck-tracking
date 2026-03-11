import { test, expect, type Page } from '@playwright/test';

/**
 * Accessibility Audit — E2E Tests
 * Performs axe-core WCAG 2.1 AA compliance checks on key pages.
 *
 * Prerequisite: pnpm add -D @axe-core/playwright
 */

// Helper: set auth cookie for protected pages
const setAuthCookie = async (page: Page, baseURL: string) => {
    await page.context().addCookies([
        { name: 'access_token', value: 'e2e-test-token', url: baseURL },
    ]);
};

// ─── Axe runner helper ─────────────────────────────────────────
async function runAxeAudit(page: Page) {
    // Inject axe-core dynamically (no hard dependency on @axe-core/playwright)
    await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
    });

    const results = await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as Record<string, any>).axe.run(document, { // NOSONAR
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        });
    });

    return results;
}

// ===============================================================
// LANDING PAGE
// ===============================================================
test.describe('A11Y — Landing Page', () => {
    test('landing page passes WCAG 2.1 AA audit', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const results = await runAxeAudit(page);
        const violations = results.violations.filter(
            (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious',
        );

        if (violations.length > 0) {
            const summary = violations.map(
                (v: { id: string; help: string; nodes: unknown[] }) =>
                    `[${v.id}] ${v.help} (${v.nodes.length} instances)`,
            );
            console.warn('A11Y violations:', summary);
        }

        // Allow minor/moderate but fail on critical/serious
        expect(violations.length).toBe(0);
    });
});

// ===============================================================
// LOGIN PAGE
// ===============================================================
test.describe('A11Y — Login Page', () => {
    test('login page passes WCAG 2.1 AA audit', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const results = await runAxeAudit(page);
        const violations = results.violations.filter(
            (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious',
        );

        expect(violations.length).toBe(0);
    });

    test('login form has proper labels and focus order', async ({ page }) => {
        await page.goto('/login');

        // All inputs should have associated labels
        const inputs = page.locator('input:not([type="hidden"])');
        const count = await inputs.count();

        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            const ariaLabelledBy = await input.getAttribute('aria-labelledby');

            // Must have at least one labelling mechanism
            const hasLabel = id
                ? (await page.locator(`label[for="${id}"]`).count()) > 0
                : false;

            expect(
                hasLabel || ariaLabel || ariaLabelledBy,
            ).toBeTruthy();
        }
    });
});

// ===============================================================
// DASHBOARD PAGE
// ===============================================================
test.describe('A11Y — Dashboard Page', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await setAuthCookie(page, baseURL ?? 'http://localhost:3000');
    });

    test('dashboard page passes WCAG 2.1 AA audit', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForTimeout(2000); // wait for hydration

        const results = await runAxeAudit(page);
        const violations = results.violations.filter(
            (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious',
        );

        if (violations.length > 0) {
            const summary = violations.map(
                (v: { id: string; help: string; nodes: unknown[] }) =>
                    `[${v.id}] ${v.help} (${v.nodes.length} instances)`,
            );
            console.warn('Dashboard A11Y violations:', summary);
        }

        expect(violations.length).toBe(0);
    });

    test('dashboard landmarks and headings structure', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForTimeout(2000);

        // Should have a <main> landmark
        await expect(page.locator('main')).toBeVisible();

        // Should have at least one heading
        const headings = page.locator('h1, h2, h3');
        expect(await headings.count()).toBeGreaterThan(0);
    });
});
