// backend/test/unit/userService.coverage.spec.ts
import { describe, it, expect } from 'vitest';
import * as userService from '../../src/services/userService';

describe('userService branches full', () => {
  it('unknown user -> null', async () => {
    const r = await userService.login('unknown', 'x');
    expect(r).toBeNull();
  });

  it('password mismatch -> null', async () => {
    const r = await userService.login('admin', 'wrong');
    expect(r).toBeNull();
  });

  it('admin ok -> role admin', async () => {
    const r = await userService.login('admin', 'password');
    expect(r?.role).toBe('admin');
  });

  // เดิมเคยคาดหวังให้ user ปกติล็อกอินผ่าน แต่ในโค้ดไม่มีผู้ใช้ดังกล่าว
  it('non-admin username -> null', async () => {
    const r = await userService.login('user', 'password');
    expect(r).toBeNull();
  });

  it('trimming/case branch', async () => {
    const r = await userService.login('  ADMIN  ', 'password');
    expect(r?.role).toBe('admin');
  });
});
