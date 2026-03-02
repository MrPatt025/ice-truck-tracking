// Type declarations for Cypress plugins used in E2E tests

// cypress-plugin-tab
declare namespace Cypress {
    interface Chainable<Subject = any> {
        /**
         * Tab to the next focusable element
         * @see https://github.com/kuceb/cypress-plugin-tab
         */
        tab(options?: Partial<{ shift: boolean }>): Chainable<Subject>
    }
}

// cypress-axe
declare namespace Cypress {
    interface cy {
        /**
         * Inject axe-core runtime into the page under test
         * @see https://github.com/component-driven/cypress-axe
         */
        injectAxe(): void

        /**
         * Run axe accessibility checks
         * @see https://github.com/component-driven/cypress-axe
         */
        checkA11y(
            context?: string | Node | object | null,
            options?: object,
            violationCallback?: (violations: any[]) => void,
            skipFailures?: boolean
        ): void

        /**
         * Run Lighthouse audit
         * @see https://github.com/mfrachet/cypress-audit
         */
        lighthouse(
            thresholds?: Record<string, number>,
            opts?: object,
            config?: object
        ): void
    }
}

// Augment PerformanceEntry with PerformanceNavigationTiming properties
interface PerformanceNavigationTiming extends PerformanceEntry {
    loadEventEnd: number
    loadEventStart: number
    domContentLoadedEventEnd: number
    domContentLoadedEventStart: number
    domComplete: number
    domInteractive: number
    redirectCount: number
    type: string
    unloadEventEnd: number
    unloadEventStart: number
}
