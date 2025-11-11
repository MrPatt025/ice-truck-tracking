import { test, expect } from '@playwright/test';
import analyze from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';

// Basic a11y smoke on key pages
// Assumes app can run without auth for these routes or shows a login page.

test.describe('a11y smoke', () => {
  test('login page has no critical violations', async ({ page }) => {
    await page.goto('/login');
    const results: AxeResults = await analyze(page, {
      detailedReport: true,
      resultTypes: ['violations'],
      includeImpactedNodes: true,
      reporter: 'v2',
    });

    const critical = results.violations.filter(
      (v: { impact?: string }) =>
        v.impact === 'serious' || v.impact === 'critical',
    );

    if (critical.length) {
      console.error('Axe critical violations on /login:', critical);
    }
    expect(critical, 'no serious/critical a11y violations on /login').toEqual(
      [],
    );
  });

  test('root page has no critical violations', async ({ page }) => {
    await page.goto('/');
    const results: AxeResults = await analyze(page, {
      detailedReport: true,
      resultTypes: ['violations'],
      includeImpactedNodes: true,
      reporter: 'v2',
    });

    const critical = results.violations.filter(
      (v: { impact?: string }) =>
        v.impact === 'serious' || v.impact === 'critical',
    );

    if (critical.length) {
      console.error('Axe critical violations on /:', critical);
    }
    expect(critical, 'no serious/critical a11y violations on /').toEqual([]);
  });
});
