import { describe, it, expect } from 'vitest';
import * as userService from '../../src/services/userService';

describe('userService branches full', () => {
  it('trim/normalize username', async () => {
    const u = await userService.login('  admin  ', 'password');
    expect(u?.username).toBe('admin');
  });

  it('wrong password branch', async () => {
    const u = await userService.login('admin', 'wrong');
    expect(u).toBeNull();
  });

  it('unknown user branch', async () => {
    const u = await userService.login('nobody', 'password');
    expect(u).toBeNull();
  });

  it('non-string inputs branch', async () => {
    // @ts-expect-error for branch coverage
    const u = await userService.login(undefined, undefined);
    expect(u).toBeNull();
  });
});
