// dashboard/e2e/auth-panel.spec.ts
import { test, expect } from '@playwright/test';

// Helper: robustly check for hydration mismatch keywords in console errors
const HYDRATION_PATTERNS = [/hydration/i, /did not match/i, /mismatch/i];

// Helper: wait until either token is present in localStorage
async function waitForToken(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () => {
        return await page.evaluate(() =>
          Boolean(
            localStorage.getItem('authToken') ||
              localStorage.getItem('auth_token'),
          ),
        );
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();
}

// Ensure we start logged-out by clearing storage and cookies
test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
    } catch {}
  });
});

// 1) Hydration-safe render and presence of either AuthPanel or Dashboard content
test('dashboard hydrates cleanly and shows auth panel or content', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const res = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  if (res) expect(res.ok(), `GET /dashboard -> ${res.status()}`).toBeTruthy();
  await page.waitForLoadState('load');

  // No hydration mismatch in console
  const hasHydrationErr = consoleErrors.some((t) =>
    HYDRATION_PATTERNS.some((re) => re.test(t)),
  );
  expect(
    hasHydrationErr,
    `Hydration errors found:\n${consoleErrors.join('\n')}`,
  ).toBeFalsy();

  // Either we see the Access panel or the main dashboard search input
  const accessHeading = page.getByRole('heading', { name: /Access/i });
  const searchInput = page.getByPlaceholder(
    'Search trucks, drivers, routes...',
  );

  await expect.any([
    expect(accessHeading).toBeVisible(),
    expect(searchInput).toBeVisible(),
  ]);
});

// 2) Sign-in flow using E2E credentials if provided via env
// Set E2E_USER and E2E_PASS in your environment to enable this test in CI.
test('can sign in from inline auth panel (if E2E creds provided)', async ({
  page,
}) => {
  const user = process.env.E2E_USER;
  const pass = process.env.E2E_PASS;
  test.skip(!user || !pass, 'E2E_USER/E2E_PASS not provided');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  // If already in dashboard, clear and reload
  const searchInput = page.getByPlaceholder(
    'Search trucks, drivers, routes...',
  );
  if (await searchInput.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
    });
    await page.reload();
  }

  // Open Sign in tab (it is default, but be explicit)
  const signInTab = page.getByRole('button', { name: /Sign in/i });
  await signInTab.click({ trial: true }).catch(() => {});

  await page.getByLabel('Username').fill(user!);
  await page.getByLabel('Password').fill(pass!);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  // Wait for token to be stored and the panel to disappear
  await waitForToken(page);
  await expect(page.getByRole('heading', { name: /Access/i })).toHaveCount(0);

  // Dashboard content should be visible
  await expect(
    page.getByPlaceholder('Search trucks, drivers, routes...'),
  ).toBeVisible();
});
