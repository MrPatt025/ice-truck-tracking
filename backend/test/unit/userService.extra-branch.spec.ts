// backend/test/unit/userService.extra-branch.spec.ts
import { describe, it, expect } from 'vitest';
import { login } from '../../src/services/userService';

describe('userService extra branches', () => {
  it('returns null for unknown user', async () => {
    const u = await login('someone-not-exist', 'password');
    expect(u).toBeNull();
  });
});
