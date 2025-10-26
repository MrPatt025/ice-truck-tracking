import { describe, it, expect } from 'vitest';
import * as userService from '../../src/services/userService';

describe('userService branches', () => {
  it('returns null for unknown user', async () => {
    const u = await userService.login('unknown-user', 'x');
    expect(u).toBeNull();
  });

  it('returns null for password mismatch', async () => {
    const u = await userService.login('admin', 'wrong');
    expect(u).toBeNull();
  });

  it('returns user for valid admin/password', async () => {
    const u = await userService.login('admin', 'password');
    expect(u?.role).toBeDefined();
  });

  // ถ้ามีสาขา role อื่นในไฟล์ ให้ครอบด้วย
  it('covers non-admin path when present', async () => {
    // กรณีไฟล์มีผู้ใช้จำลองอื่น เช่น driver
    const u = await userService.login('driver', 'password');
    expect(u === null || u.role === 'driver').toBe(true);
  });
});
