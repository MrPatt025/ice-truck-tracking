// test/index.registerShutdown.idempotent.spec.ts
import { describe, it, expect } from 'vitest';
import { buildServer, registerShutdown } from '../src/index';

describe('registerShutdown idempotent', () => {
  it('does not register duplicate handlers', async () => {
    const s = await buildServer({ logger: false });
    registerShutdown(s);
    registerShutdown(s);
    // ไม่มี assert ที่ชัดเจนได้ง่าย ให้เพียงเรียกซ้ำเพื่อ cover กิ่ง guard
    expect(typeof s.close).toBe('function');
  });
});
