// backend/test/startup.failure.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildServer, start } from '../src/index';

describe('start() error path', () => {
  const origExit = process.exit;

  beforeEach(() => {
    // กันไม่ให้โปรเซสจริง exit ระหว่างเทส
    // @ts-expect-error override in test
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    // @ts-expect-error restore
    process.exit = origExit;
    vi.restoreAllMocks();
  });

  it('เรียก exit(1) เมื่อ listen ล้ม', async () => {
    const app = await buildServer({ logger: false } as any);
    vi.spyOn(app, 'listen').mockRejectedValueOnce(new Error('boom'));

    const exit = vi.fn();

    try {
      // ถ้า start รองรับ DI จะใช้ exit นี้ ถ้าไม่รองรับ อาร์กิวเมนต์จะถูกเมิน
      // @ts-expect-error keep compatibility with old signature
      await start(app, { exit });
    } catch {
      // ถ้า start โยน error ออกมา ให้กลืนไว้เพื่อเช็คว่า exit ถูกเรียกหรือไม่
    }

    // ยอมรับได้ทั้งถูกเรียกผ่าน DI หรือ process.exit ตรงๆ
    try {
      expect(exit).toHaveBeenCalledWith(1);
    } catch {
      expect(process.exit).toHaveBeenCalledWith(1);
    }
  });
});
