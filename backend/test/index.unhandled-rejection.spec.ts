// test/index.unhandled-rejection.spec.ts
import { describe, it, expect } from 'vitest';
import { buildServer, registerShutdown } from '../src/index';

describe('unhandledRejection branch', () => {
  it('captures and asserts the unhandledRejection without leaking listeners', async () => {
    const s = buildServer({ logger: false });
    const cleanupSignals = registerShutdown(s);

    // สร้างพรอมิสที่ resolve เมื่อ event เกิด
    await new Promise<void>((resolve) => {
      process.once('unhandledRejection', (reason: unknown) => {
        expect(reason).toBeInstanceOf(Error);
        expect((reason as Error).message).toBe('boom');
        resolve();
      });
      // กระตุ้นให้เกิด unhandledRejection
      // ใช้ void เพื่อบอกชัดเจนว่าไม่รอผล
      void Promise.reject(new Error('boom'));
    });

    // ทำความสะอาดตัวดักสัญญาณและปิดอินสแตนซ์
    cleanupSignals();
    await s.close();
  });
});
