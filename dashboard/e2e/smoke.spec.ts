// dashboard/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// ยืดหยุ่นกับชื่อแอปหลายแบรนด์ผ่าน env หรือ fallback
const TITLE_PATTERNS: RegExp[] = process.env.E2E_TITLE_REGEX
  ? [new RegExp(process.env.E2E_TITLE_REGEX, 'i')]
  : [/Apollo ColdChain/i, /Ice Truck/i, /Cold ?Chain/i];

test.describe('Smoke', () => {
  test('home renders, clean console, and basic a11y passes', async ({
    page,
  }) => {
    // เก็บ console errors ตั้งแต่ก่อนเริ่มโหลด
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1) ไปหน้าแรก
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (res) {
      expect(res.ok(), `GET / should be OK, got ${res.status()}`).toBeTruthy();
    }
    // Be lenient: some long-lived connections (e.g., websockets) may prevent 'networkidle'
    await page.waitForLoadState('load');

    // 2) Title ยืดหยุ่น (รองรับหลาย branding)
    const title = await page.title();
    const titleOk = TITLE_PATTERNS.some((re) => re.test(title));
    expect(
      titleOk,
      `Title "${title}" does not match any of ${TITLE_PATTERNS.map(String).join(', ')}`,
    ).toBeTruthy();

    // 3) ไม่มี console error ระหว่างโหลด
    await page.evaluate(() => Promise.resolve()); // flush microtasks
    expect(
      consoleErrors,
      `Console errors:\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);

    // 4) ตรวจ a11y (serious/critical เท่านั้น) โดยไม่สแกน canvas/map ที่ก่อ false-positive บ่อย
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .exclude('#map, [data-axe-skip]')
      .analyze();

    const serious = axe.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect.soft(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
  });
});
