import { describe, it, expect } from 'vitest';
import * as userService from '../../src/services/userService';

describe('userService branches', () => {
  it('invalid username + valid password -> null', async () => {
    const r = await userService.login('not-admin', 'password');
    expect(r).toBeNull();
  });

  it('valid username + invalid password -> null', async () => {
    const r = await userService.login('admin', 'wrong');
    expect(r).toBeNull();
  });

  // มีเคสผ่านแล้ว: admin/password ในชุดเทสต์เดิม
});
