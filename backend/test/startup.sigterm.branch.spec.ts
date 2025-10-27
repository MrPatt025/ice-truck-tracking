// backend/test/startup.sigterm.branch.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { app, registerShutdown } from '../src/index';

afterEach(() => {
  process.removeAllListeners('SIGTERM');
  vi.restoreAllMocks();
});

describe('SIGTERM branch', () => {
  it('closes server on SIGTERM', async () => {
    const closeSpy = vi.spyOn(app, 'close').mockResolvedValue(undefined as any);

    // ผูก handler สำหรับ SIGTERM ให้แน่ใจว่าเทสเห็น
    registerShutdown(app);

    // จำลองสัญญาณ
    process.emit('SIGTERM');

    // รอจน close ถูกเรียก
    await vi.waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
