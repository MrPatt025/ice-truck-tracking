// Storybook test-runner configuration (CommonJS, JS only)
// Keeps config compatible with the runner's SWC/Jest stack and Storybook 9.

/**
 * @type {import('@storybook/test-runner').TestRunnerConfig}
 */
const config = {
  async preVisit(page) {
    // Prefer reduced motion for deterministic runs
    await page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }',
    });
  },
  async postVisit(page) {
    // Exclude map canvas and any element explicitly opted-out via data-axe-skip
    await page.addScriptTag({
      content:
        "window.__a11yExcludeSelectors = ['canvas', '#map', '[data-axe-skip]'];",
    });
  },
  async getAxeOptions() {
    return {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: {
        // Allow empty buttons if used as purely decorative map controls in stories
        'button-name': { enabled: true },
      },
    };
  },
};

module.exports = config;
