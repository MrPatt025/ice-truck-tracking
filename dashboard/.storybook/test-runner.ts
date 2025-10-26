// Configure axe to reduce false positives for heavy graphics (maps/canvas) and animations
const config = {
  async preVisit(page: any) {
    // Prefer reduced motion for deterministic runs
    await page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }',
    });
  },
  async postVisit(page: any, _context: any) {
    // Exclude map canvas and any element explicitly opted-out via data-axe-skip
    await page.addScriptTag({
      content: `window.__a11yExcludeSelectors = ['canvas', '#map', '[data-axe-skip]'];`,
    });
  },
  // Axe options
  async getAxeOptions() {
    return {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
      rules: {
        // Allow empty buttons if used as purely decorative map controls in stories
        'button-name': { enabled: true },
      },
      // Exclude selectors defined above (handled in test runner's axe integration)
    } as any;
  },
} as const;

export default config;
