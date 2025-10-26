// test/userService.branches.last.spec.ts
import { it, expect } from 'vitest';
import * as user from '../src/services/userService';
it('login trims and rejects whitespace-only', async () => {
  const u = await user.login('   ', '   ');
  expect(u).toBeNull();
});
