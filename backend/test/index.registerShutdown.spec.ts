// backend/test/index.registerShutdown.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildServer, registerShutdown } from '../src/index';

describe('registerShutdown ในโหมดเทส: ปิด server แต่ไม่ exit', () => {
  let server: any;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // เคลียร์ listeners ให้เริ่มสะอาด
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');

    // spy และป้องกัน process.exit ออกจากโปรเซสจริง
    exitSpy = vi
      .spyOn(process, 'exit')
      // @ts-expect-error mock ให้เป็น no-op และพอใจ signature never
      .mockImplementation((() => undefined) as any);

    process.env.NODE_ENV = 'test';
    server = buildServer({ logger: false });
    server.close = vi.fn().mockResolvedValue(undefined);
    registerShutdown(server);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('ติดตั้งแฮนด์เลอร์สัญญาณครบและครั้งเดียว', () => {
    expect(process.listenerCount('SIGINT')).toBe(1);
    expect(process.listenerCount('SIGTERM')).toBe(1);
  });

  it('SIGTERM: เรียก close แล้วไม่เรียก exit', async () => {
    process.emit('SIGTERM' as any);
    await vi.waitFor(() => expect(server.close).toHaveBeenCalledTimes(1));
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('SIGINT: เรียก close แล้วไม่เรียก exit', async () => {
    process.emit('SIGINT' as any);
    await vi.waitFor(() => expect(server.close).toHaveBeenCalledTimes(1));
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
