// Type declarations for Cypress plugins used in E2E tests.

declare global {
    namespace Cypress {
        interface Chainable<Subject = unknown> {
            visit(url: string): Chainable<Subject>
            intercept(
                methodOrUrl: string,
                urlOrResponse?: unknown,
                response?: unknown
            ): Chainable<Subject>
            get(selector: string): Chainable<unknown>
            wait(aliasOrTime: string | number): Chainable<unknown>
            request(url: string): Chainable<{ status: number; body: Record<string, unknown> }>
            request(method: string, url: string): Chainable<{ status: number; body: Record<string, unknown> }>
            window(): Chainable<Window>
            focused(): Chainable<unknown>
            reload(): Chainable<Subject>
            as(alias: string): Chainable<Subject>
            stub(target: object, property: string): { value(nextValue: boolean): void }
            should(chainers: string, value?: unknown, value2?: unknown): Chainable<Subject>
            click(): Chainable<Subject>
            first(): Chainable<Subject>
            rightclick(): Chainable<Subject>
            select(value: string): Chainable<Subject>
            trigger(eventName: string, options?: Record<string, unknown>): Chainable<Subject>
            then<TResult>(fn: (value: Subject) => TResult): Chainable<TResult>
            its(prop: 'performance'): Chainable<Performance>
            its(prop: string): Chainable<unknown>

            /**
             * Tab to the next focusable element
             * @see https://github.com/kuceb/cypress-plugin-tab
             */
            tab(options?: Partial<{ shift: boolean }>): Chainable<Subject>

            /**
             * Inject axe-core runtime into the page under test
             * @see https://github.com/component-driven/cypress-axe
             */
            injectAxe(): Chainable<Subject>

            /**
             * Run axe accessibility checks
             * @see https://github.com/component-driven/cypress-axe
             */
            checkA11y(
                context?: string | Node | object | null,
                options?: object,
                violationCallback?: (violations: unknown[]) => void,
                skipFailures?: boolean
            ): Chainable<Subject>

            /**
             * Run Lighthouse audit
             * @see https://github.com/mfrachet/cypress-audit
             */
            lighthouse(
                thresholds?: Record<string, number>,
                opts?: object,
                config?: object
            ): Chainable<Subject>
        }
    }

    const cy: Cypress.Chainable<unknown>
    const expect: {
        (value: unknown): {
            to: {
                eq(expected: unknown): void
                have: {
                    property(name: string): void
                }
                not: {
                    deep: {
                        equal(expected: unknown): void
                    }
                }
                be: {
                    lessThan(expected: number): void
                }
            }
        }
    }
    function describe(name: string, fn: () => void): void
    function it(name: string, fn: () => void): void
    function beforeEach(fn: () => void): void
}

export {}
