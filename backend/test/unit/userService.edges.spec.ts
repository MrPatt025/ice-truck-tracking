// test/unit/userService.edges.spec.ts
import { describe, it, expect } from 'vitest';
import * as S from '../../src/services/userService';

describe('userService edge cases', () => {
  it('trims spaces in username and password', async () => {
    const ok = await S.login('  admin  ', '  password  ');
    expect(ok?.username).toBe('admin');
    expect(ok?.role).toBe('admin');
  });

  it('accepts case-insensitive username', async () => {
    const ok = await S.login('Admin', 'password');
    expect(ok?.username).toBe('admin');
  });

  it('rejects password mismatch', async () => {
    const miss = await S.login('admin', 'wrong');
    expect(miss).toBeNull();
  });
});
