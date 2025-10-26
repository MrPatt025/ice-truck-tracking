// backend/test/unit/userService.branches.extra.spec.ts
import { describe, it, expect } from 'vitest';
import * as userService from '../../src/services/userService';

describe('userService extra branches', () => {
  it('normalize username (trim + lowercase)', async () => {
    const u = await userService.login('  ADMIN  ', 'password');
    expect(u?.role).toBe('admin');
  });
});
