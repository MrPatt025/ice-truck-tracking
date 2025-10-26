// backend/test/startup.exit.branch.spec.ts
import { describe, it, expect, vi } from 'vitest';
import server, { start } from '../src/index';

describe('start() failure branch calls exitFn', () => {
  it('covers exit branch without killing process', async () => {
    // ทำให้ listen ล้มเหลวหนึ่งครั้ง
    const listenSpy = vi
      .spyOn(server, 'listen')
      .mockRejectedValueOnce(new Error('fail'));

    // exitFn แบบกำหนดเองเพื่อไม่ให้ process จริงๆ ออก
    const exitFn = vi.fn() as unknown as (code: number) => never;

    // ส่ง srv เข้าไปชัดเจน
    await start({ exitFn, srv: server });

    expect(exitFn).toHaveBeenCalledTimes(1);
    expect(exitFn).toHaveBeenCalledWith(1);

    listenSpy.mockRestore();
  });
});
