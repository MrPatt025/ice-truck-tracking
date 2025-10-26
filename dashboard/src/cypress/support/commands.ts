/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Press TAB (optionally with Shift) on the current subject, N times.
       */
      tab(options?: {
        shift?: boolean;
        times?: number;
        force?: boolean;
      }): Chainable<JQuery<HTMLElement>>;

      /**
       * Inject axe-core from CDN if not already present. No-op on failure.
       */
      injectAxe(): Chainable<void>;

      /**
       * Run axe-core a11y audit. Logs violations to console without failing tests.
       */
      checkA11y(options?: {
        runOnly?: Array<'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa'>;
      }): Chainable<void>;

      /**
       * Run Lighthouse via a registered `task('lighthouse')`. Skips unless ENABLE_LIGHTHOUSE=1.
       */
      lighthouse(
        thresholds?: Partial<
          Record<
            'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa',
            number
          >
        >,
      ): Chainable<void>;
    }
  }
}
export {};

// -----------------------------------------------------------------------------
// Keyboard: tab
// -----------------------------------------------------------------------------
Cypress.Commands.add(
  'tab',
  { prevSubject: 'element' },
  (
    subject: JQuery<HTMLElement>,
    options?: { shift?: boolean; times?: number; force?: boolean },
  ): Cypress.Chainable<JQuery<HTMLElement>> => {
    const times =
      typeof options?.times === 'number' && Number.isFinite(options.times)
        ? options.times
        : 1;
    const key = options?.shift ? '{shift}{tab}{/shift}' : '{tab}';
    const force = options?.force ?? true;

    let chain = cy.wrap(subject, { log: false });
    for (let i = 0; i < times; i += 1) {
      chain = chain.type(key, { force, log: false });
    }
    return chain;
  },
);

// -----------------------------------------------------------------------------
// A11y: axe-core (safe in environments without plugin/internet)
// -----------------------------------------------------------------------------
Cypress.Commands.add('injectAxe', (): Cypress.Chainable<void> => {
  return cy.window({ log: false }).then<void>((win) => {
    const w = win as unknown as { axe?: any; document: Document };
    if (w.axe) return;

    // ใช้ Promise ปกติเพื่อเลี่ยงชนิด Bluebird
    return new Promise<void>((resolve) => {
      const s = w.document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.7.0/axe.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve(); // no-op ถ้าโหลดไม่ได้
      w.document.head.appendChild(s);
    });
  });
});

Cypress.Commands.add(
  'checkA11y',
  (options?: {
    runOnly?: Array<'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa'>;
  }): Cypress.Chainable<void> => {
    return cy.window({ log: false }).then<void>(async (win) => {
      const w = win as unknown as { axe?: any; document: Document };
      if (!w.axe || typeof w.axe.run !== 'function') {
        Cypress.log({
          name: 'checkA11y',
          message: 'axe-core not available. Skipped.',
        });
        return;
      }
      const runOnly = options?.runOnly ?? ['wcag2a', 'wcag2aa'];
      const results = await w.axe.run(w.document, { runOnly });

      const violations = results?.violations ?? [];
      if (violations.length) {
        // รายงานแบบย่อเพื่อดูเร็ว ๆ ไม่ fail เทส

        console.table(
          violations.map((v: any) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes?.length ?? 0,
            description: v.description,
            help: v.help,
          })),
        );
      }
    });
  },
);

// -----------------------------------------------------------------------------
// Performance: Lighthouse via cypress task (run only if enabled)
// -----------------------------------------------------------------------------
Cypress.Commands.add(
  'lighthouse',
  (
    thresholds?: Partial<
      Record<
        'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa',
        number
      >
    >,
  ): Cypress.Chainable<void> => {
    if (!Cypress.env('ENABLE_LIGHTHOUSE')) {
      Cypress.log({
        name: 'lighthouse',
        message: 'Skipped (ENABLE_LIGHTHOUSE not set).',
      });
      return cy.wrap(undefined, { log: false }) as Cypress.Chainable<void>;
    }
    return cy
      .task('lighthouse', { thresholds }, { log: false })
      .then(() => undefined as void);
  },
);
