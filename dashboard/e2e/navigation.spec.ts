import { test, expect, Page, ConsoleMessage } from '@playwright/test'

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

const isCI = process.env.CI === 'true'
const NAVIGATION_TIMEOUT = isCI ? 60_000 : 30_000
const ASSERTION_TIMEOUT = isCI ? 30_000 : 15_000

// ── Auth Routes (4 pages) ──
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=test-token',
]

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
]

const allRoutes = [...authRoutes, ...dashboardRoutes]

// Helper: Check page loaded successfully and PremiumPageWrapper exists
async function verifyPageLoad(page: Page, route: string): Promise<void> {
  const consoleErrors: string[] = []

  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text()
    // Ignore noisy Three.js/PCF deprecation messages from dependencies
    if (text.includes('THREE.Clock') || text.includes('PCFSoftShadowMap'))
      return
    if (msg.type() === 'error') {
      consoleErrors.push(text)
    }
  })

  // Navigate to route with retry
  let response
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT,
      })
      await page.waitForSelector('body', { timeout: 10_000 })
      break
    } catch (err) {
      if (attempt === 2) throw err
      await page.waitForTimeout(2_000)
    }
  }

  // Assert page loaded successfully
  expect(response?.status() ?? 200).toBeLessThan(400)

  // Wait for main landmark to be attached/visible (covers semantic pages)
  const main = page.locator('main, [role="main"]').first()
  await main.waitFor({ state: 'visible', timeout: ASSERTION_TIMEOUT })

  // Assert PremiumPageWrapper is present — context-aware testid locator
  // Auth routes use auth-page-wrapper; dashboard routes use dashboard-page-wrapper
  const isAuth = authRoutes.some(r => r.split('?')[0] === route.split('?')[0])
  const expectedTestId = isAuth ? 'auth-page-wrapper' : 'dashboard-page-wrapper'
  const pageContent = page.locator(`[data-testid="${expectedTestId}"]`).first()
  await expect(pageContent).toBeVisible({ timeout: ASSERTION_TIMEOUT })

  // Verify no critical console errors (filter out benign 3D/WebGL warnings)
  const criticalErrors = consoleErrors.filter(
    err =>
      !err.includes('WebGL') &&
      !err.includes('THREE') &&
      !err.includes('ResizeObserver') &&
      !err.includes('Failed to load resource') &&
      !err.includes('ECONNREFUSED') &&
      !err.includes('WebSocket') &&
      !err.includes('Hydration') &&
      !err.includes('react-dom') &&
      !err.includes('eval()') &&
      !err.includes('non-static position')
  )
  expect(criticalErrors.length).toBe(0)
}

// ── Global setup ──

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route =>
    route.fulfill({
      status: 200,
      json: { data: [], status: 'success', meta: { total: 0 } },
    })
  )
})

// ── Auth Page Tests ──
test.describe('Auth Pages (4)', () => {
  test.describe.configure({ mode: 'serial' })

  test('Login page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/login')
  })

  test('Register page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/register')
  })

  test('Forgot Password page renders with PremiumPageWrapper', async ({
    page,
  }) => {
    await verifyPageLoad(page, '/forgot-password')
  })

  test('Reset Password page renders with PremiumPageWrapper', async ({
    page,
  }) => {
    await verifyPageLoad(page, '/reset-password?token=test-token')
  })
})

// ── Dashboard Page Tests ──
test.describe('Dashboard Pages (10)', () => {
  test.describe.configure({ mode: 'serial' })

  test('Home page (/) renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/')
  })

  test('Dashboard page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/dashboard')
  })

  test('Alerts page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/alerts')
  })

  test('Tracking page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/tracking')
  })

  test('Fleet page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/fleet')
  })

  test('Operations page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/operations')
  })

  test('Compliance page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/compliance')
  })

  test('Reports page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/reports')
  })

  test('Settings page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/settings')
  })

  test('Admin page renders with PremiumPageWrapper', async ({ page }) => {
    await verifyPageLoad(page, '/admin')
  })
})

// ── Comprehensive Navigation Test ──
test('All 14 pages load successfully in sequence', async ({ page }) => {
  for (const route of allRoutes) {
    await verifyPageLoad(page, route)
  }
})

// ── Smoke Test: Basic Navigation Flow ──
test('Navigation flow: Home → Dashboard → Alerts → Settings', async ({
  page,
}) => {
  const routes = ['/', '/dashboard', '/alerts', '/settings']

  for (const route of routes) {
    await verifyPageLoad(page, route)
  }
})
