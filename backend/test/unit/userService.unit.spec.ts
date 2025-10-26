// backend/test/unit/userService.unit.spec.ts
import { describe, it, expect, vi } from 'vitest';

describe('userService.login', () => {
  it('reject invalid', async () => {
    vi.resetModules();
    process.env.ALLOW_DEMO_LOGIN = 'true';
    const userService = await import('../../src/services/userService.js');
    const u = await userService.login('x', 'y');
    expect(u).toBeNull();
  });

  it('accept admin/password when demo enabled', async () => {
    vi.resetModules();
    process.env.ALLOW_DEMO_LOGIN = 'true';
    const userService = await import('../../src/services/userService.js');
    const u = await userService.login('admin', 'password');
    expect(u).not.toBeNull();
    expect(u!.role).toBe('admin');
  });
});
