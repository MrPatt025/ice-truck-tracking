import { test, expect, type Page } from '@playwright/test'

type RouteAuditCase = {
    path: string
    requiresAuth: boolean
}

const ROUTES: ReadonlyArray<RouteAuditCase> = [
    { path: '/', requiresAuth: false },
    { path: '/dashboard', requiresAuth: true },
    { path: '/fleet', requiresAuth: true },
    { path: '/alerts', requiresAuth: true },
    { path: '/reports', requiresAuth: true },
    { path: '/settings', requiresAuth: true },
    { path: '/admin', requiresAuth: true },
    { path: '/login', requiresAuth: false },
    { path: '/register', requiresAuth: false },
    { path: '/forgot-password', requiresAuth: false },
    { path: '/reset-password', requiresAuth: false },
]

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
] as const

const KNOWN_TOUCH_ACTION_PAGEERROR =
    "Cannot set properties of undefined (setting 'touchAction')"

function collectRuntimeErrors(page: Page): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    page.on('pageerror', (err: Error) => {
        const details = err.stack ? `${err.message}\n${err.stack}` : err.message
        errors.push(`pageerror: ${details}`)
    })

    page.on('console', msg => {
        const text = msg.text().toLowerCase()
        if (msg.type() === 'error') {
            errors.push(msg.text())
            return
        }

        if (
            msg.type() === 'warning' &&
            (text.includes('hydration') || text.includes('did not match'))
        ) {
            warnings.push(msg.text())
        }
    })

    return { errors, warnings }
}

/** Navigate with retry logic */
async function gotoWithRetry(page: Page, path: string, retries = 2): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await page.goto(path, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            })
            await page.waitForSelector('body', { timeout: 10_000 })
            return
        } catch (err) {
            if (attempt === retries) throw err
            await page.waitForTimeout(2_000)
        }
    }
}

for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
        test(`route audit: ${route.path} (${viewport.name})`, async ({ page }) => {
            // Mock backend API calls to avoid CI/backend dependency during route audits
            await page.route('**/api/v1/**', route =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    json: { data: [], status: 'success', meta: { total: 0 } },
                })
            )
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            const runtime = collectRuntimeErrors(page)

            await gotoWithRetry(page, route.path)
            await page.waitForLoadState('networkidle').catch(() => {
                // networkidle may not complete in time for some pages — continue
            })

            const finalUrl = page.url()
            const redirectedToLogin = finalUrl.includes('/login')

            if (route.requiresAuth) {
                expect(
                    redirectedToLogin || finalUrl.endsWith(route.path),
                    `Expected ${route.path} to render or redirect to /login`
                ).toBeTruthy()
            } else {
                expect(finalUrl).toContain(route.path)
            }

            const body = page.locator('body')
            await expect(body).toBeVisible()

            const heading = page.locator('h1, h2').first()
            await expect(heading).toBeVisible({ timeout: 15_000 })

            const landmark = page.locator('main, [role="main"], form, section').first()
            await landmark.waitFor({ state: 'visible', timeout: 15_000 })

            const filteredErrors = runtime.errors.filter(error =>
                !error.includes(KNOWN_TOUCH_ACTION_PAGEERROR) &&
                !error.includes('eval() is not supported') &&
                !error.includes('React will never use eval()') &&
                !error.includes('non-static position')
            );

            const filteredWarnings = runtime.warnings.filter(warn =>
                !warn.includes('THREE.Timer') &&
                !warn.includes('THREE.WebGLShadowMap') &&
                !warn.includes('eval() is not supported')
            );

            expect(filteredErrors, `Console/runtime errors on ${route.path}`).toEqual([])
            expect(filteredWarnings, `Hydration warnings on ${route.path}`).toEqual([])
        })
    }
}
