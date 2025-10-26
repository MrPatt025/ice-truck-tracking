import { describe, it, expect } from 'vitest';
import { login } from '../../src/services/userService';

describe('userService password mismatch', () => {
  it('returns null when password mismatch', async () => {
    const res = await login('admin', 'wrong'); // หรือ username อะไรก็ได้ที่ไม่ตรงเงื่อนไขใน service
    expect(res).toBeNull();
  });
});
