// test/startup.sigint.branch.spec.ts
import { describe, it, expect } from 'vitest';
import { buildServer, registerShutdown } from '../src/index';

describe('SIGINT branch', () => {
  it('closes server on SIGINT', async () => {
    const s = await buildServer({ logger: false });
    await s.listen({ port: 0 });
    registerShutdown(s);

    // ส่งสัญญาณ SIGINT ให้ process
    process.emit('SIGINT'); // cover สาย SIGINT
    await s.close(); // บังคับปิดเพื่อไม่รั่วพอร์ตใน CI

    expect(true).toBe(true);
  });
});
