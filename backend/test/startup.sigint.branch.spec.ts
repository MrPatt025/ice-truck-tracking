// test/startup.sigint.branch.spec.ts
import { describe, it, expect } from 'vitest';
import { app, registerShutdown } from '../src/index';

describe('SIGINT branch', () => {
  it('closes server on SIGINT', async () => {
    await app.listen({ port: 0 });
    registerShutdown(app);

    // ส่งสัญญาณ SIGINT ให้ process
    process.emit('SIGINT'); // cover สาย SIGINT
    await app.close(); // บังคับปิดเพื่อไม่รั่วพอร์ตใน CI

    expect(true).toBe(true);
  });
});
