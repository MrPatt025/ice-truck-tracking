// dashboard/e2e/guards.spec.ts
import { test, expect } from '@playwright/test';

// Ensure we start clean for each test
test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

// Unauthenticated visit to a protected page should redirect to /login
test('unauthenticated user is redirected to /login', async ({ page }) => {
  const res = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  if (res) expect(res.ok(), `GET /dashboard -> ${res.status()}`).toBeTruthy();
  await page.waitForLoadState('load');

  // Should land on /login due to middleware
  expect(new URL(page.url()).pathname).toBe('/login');

  // And the login heading should be visible
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

// Authenticated visit to /login should redirect to /dashboard
test('authenticated user hitting /login is redirected to /dashboard', async ({
  context,
  page,
}) => {
  // Set an auth cookie expected by middleware
  await context.addCookies([
    {
      name: 'authToken',
      value: 'e2e-dummy',
      url: page.url() || 'http://localhost/',
      path: '/',
      httpOnly: false,
    },
  ]);

  const res = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  if (res) expect(res.ok(), `GET /login -> ${res.status()}`).toBeTruthy();
  await page.waitForLoadState('load');

  expect(new URL(page.url()).pathname).toBe('/dashboard');
  // Basic dashboard element visible
  await expect(
    page.getByPlaceholder('Search trucks, drivers, routes...'),
  ).toBeVisible();
});
