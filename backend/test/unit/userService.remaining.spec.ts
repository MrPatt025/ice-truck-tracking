import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isDemoLoginAllowed,
  readDemoCreds,
  toPublicUser,
  isAdmin,
  resolveJwtSecret,
} from '../../src/services/userService';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...OLD_ENV };
  delete process.env.DEMO_LOGIN;
  delete process.env.DEMO_CREDS;
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('userService remaining branches', () => {
  it('isDemoLoginAllowed: ค่าเริ่มต้น = true และ parse on/off ถูกต้อง', () => {
    delete process.env.DEMO_LOGIN;
    expect(isDemoLoginAllowed()).toBe(true);

    process.env.DEMO_LOGIN = '0';
    expect(isDemoLoginAllowed()).toBe(false);
    process.env.DEMO_LOGIN = 'false';
    expect(isDemoLoginAllowed()).toBe(false);

    process.env.DEMO_LOGIN = '1';
    expect(isDemoLoginAllowed()).toBe(true);
    process.env.DEMO_LOGIN = 'true';
    expect(isDemoLoginAllowed()).toBe(true);
  });

  it('readDemoCreds: ไม่มี -> ดีฟอลต์, รูปแบบรองรับ -> override, รูปแบบไม่รองรับ/พัง/ว่าง -> ดีฟอลต์', () => {
    // 1) ไม่มี env -> ดีฟอลต์
    delete process.env.DEMO_CREDS;
    expect(readDemoCreds()).toEqual({
      adminUser: 'admin',
      adminPass: 'password',
      userUser: 'demo',
      userPass: 'demo',
    });

    // 2) รูปแบบที่รองรับ -> override
    process.env.DEMO_CREDS = JSON.stringify({
      adminUser: 'adminX',
      adminPass: 'secretX',
      userUser: 'userX',
      userPass: 'passX',
    });
    expect(readDemoCreds()).toEqual({
      adminUser: 'adminX',
      adminPass: 'secretX',
      userUser: 'userX',
      userPass: 'passX',
    });

    // 3) รูปแบบไม่รองรับ ({username,password}) -> fallback ดีฟอลต์
    process.env.DEMO_CREDS = '{"username":"demo","password":"pass"}';
    expect(readDemoCreds()).toEqual({
      adminUser: 'admin',
      adminPass: 'password',
      userUser: 'demo',
      userPass: 'demo',
    });

    // 4) JSON พัง -> fallback ดีฟอลต์
    process.env.DEMO_CREDS = '{invalid';
    expect(readDemoCreds()).toEqual({
      adminUser: 'admin',
      adminPass: 'password',
      userUser: 'demo',
      userPass: 'demo',
    });

    // 5) ค่าว่าง -> fallback ดีฟอลต์
    process.env.DEMO_CREDS = '';
    expect(readDemoCreds()).toEqual({
      adminUser: 'admin',
      adminPass: 'password',
      userUser: 'demo',
      userPass: 'demo',
    });
  });

  it('toPublicUser: ตัดฟิลด์ลับออก เหลือเฉพาะ id/username/role', () => {
    const pub = toPublicUser({ id: 1, username: 'u', role: 'admin' } as any);
    expect(pub).toEqual({ id: 1, username: 'u', role: 'admin' });
  });

  it('isAdmin: true/false ตาม role', () => {
    expect(isAdmin({ id: 1, username: 'a', role: 'admin' } as any)).toBe(true);
    expect(isAdmin({ id: 2, username: 'b', role: 'user' } as any)).toBe(false);
  });

  it('resolveJwtSecret: มี JWT_SECRET ใช้ค่านั้น ไม่มีก็คืน fallback', () => {
    expect(resolveJwtSecret({ JWT_SECRET: 'x' } as any)).toBe('x');
    expect(resolveJwtSecret({} as any)).toEqual(expect.any(String));
  });
});
