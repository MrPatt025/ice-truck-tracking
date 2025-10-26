// backend/test/startup.success.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import server, { start } from '../src/index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startup branches', () => {
  it('success path: listen resolves -> not exit', async () => {
    const listenSpy = vi
      .spyOn(server, 'listen')
      .mockResolvedValue(undefined as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      );

    await expect(start()).resolves.toBeUndefined();
    expect(listenSpy).toHaveBeenCalledOnce();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('failure path: listen rejects -> calls process.exit(1) (spied)', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      );
    const listenSpy = vi
      .spyOn(server, 'listen')
      .mockRejectedValue(new Error('boom'));

    await expect(start()).resolves.toBeUndefined();
    expect(listenSpy).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
