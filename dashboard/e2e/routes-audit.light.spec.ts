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

function collectRuntimeErrors(page: Page): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    page.on('pageerror', (err: Error) => {
        errors.push(`pageerror: ${err.message}`)
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

for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
        test(`route audit: ${route.path} (${viewport.name})`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            const runtime = collectRuntimeErrors(page)

            await page.goto(route.path, { waitUntil: 'domcontentloaded' })
            await page.waitForLoadState('networkidle')

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
            await expect(heading).toBeVisible()

            const landmark = page.locator('main, [role="main"], form, section').first()
            await expect(landmark).toBeVisible()

            expect(runtime.errors, `Console/runtime errors on ${route.path}`).toEqual([])
            expect(runtime.warnings, `Hydration warnings on ${route.path}`).toEqual([])
        })
    }
}
