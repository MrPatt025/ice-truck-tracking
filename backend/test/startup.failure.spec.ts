// backend/test/startup.failure.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import server, { start } from '../src/index';

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
    vi.spyOn(server, 'listen').mockRejectedValueOnce(new Error('boom'));

    try {
      await start();
    } catch {
      // swallow
    }

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
