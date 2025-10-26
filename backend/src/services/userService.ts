// backend/src/services/userService.ts

/** บทบาทที่ระบบรองรับ */
export type Role = 'admin' | 'user' | 'demo';

/** โมเดลผู้ใช้ภายใน */
export type User = { id: number; username: string; role: Role };

/** โมเดลผู้ใช้สำหรับตอบ API */
export type PublicUser = Pick<User, 'id' | 'username' | 'role'>;

/** โครง creds สำหรับ DEMO (internal) */
type DemoCreds = {
  adminUser: string;
  adminPass: string;
  userUser: string;
  userPass: string;
};

/** ค่าพื้นฐานของ DEMO (อ่านอย่างเดียว) */
const DEMO_DEFAULT: Readonly<DemoCreds> = Object.freeze({
  adminUser: 'admin',
  adminPass: 'password',
  userUser: 'demo',
  userPass: 'demo',
});

/** แปลง string env flag เป็น boolean */
function parseBoolFlag(v: string | undefined, fallback: boolean): boolean {
  if (v == null) return fallback;
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return fallback;
}

/** อนุญาต DEMO login หรือไม่ (ดีฟอลต์: true) */
export function isDemoLoginAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // Prefer DEMO_LOGIN; fall back to ALLOW_DEMO_LOGIN for backward compatibility
  const flag = env.DEMO_LOGIN ?? env.ALLOW_DEMO_LOGIN;
  return parseBoolFlag(flag, true);
}

/** utils สำหรับอ่านสตริงจาก path ใน object */
function getStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function fromPath(o: unknown, path: string[]): string | undefined {
  let cur: unknown = o;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return getStr(cur);
}
function firstStr(o: unknown, candidates: string[][]): string | undefined {
  for (const p of candidates) {
    const v = fromPath(o, p);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** อ่าน DEMO creds จาก ENV.DEMO_CREDS (รองรับทั้งแบบ flat และ nested) */
export function readDemoCreds(env: NodeJS.ProcessEnv = process.env): DemoCreds {
  // 1) Try JSON in DEMO_CREDS/DEMO_CREDENTIALS. Only accept when all four values exist and are non-empty strings.
  const raw = (env.DEMO_CREDS ?? env.DEMO_CREDENTIALS)?.trim();
  if (raw) {
    try {
      const o = JSON.parse(raw) as unknown;
      if (o && typeof o === 'object') {
        const aU = firstStr(o, [['adminUser']]);
        const aP = firstStr(o, [['adminPass']]);
        const uU = firstStr(o, [['userUser']]);
        const uP = firstStr(o, [['userPass']]);
        if (
          typeof aU === 'string' &&
          typeof aP === 'string' &&
          typeof uU === 'string' &&
          typeof uP === 'string'
        ) {
          return {
            adminUser: aU,
            adminPass: aP,
            userUser: uU,
            userPass: uP,
          };
        }
      }
    } catch {
      // ignore parse errors -> fall through to env vars/default
    }
  }

  // 2) Try flat env vars (support both DEMO_* and legacy non-prefixed). Only accept when all four are provided.
  const envAdminUser = (env.DEMO_ADMIN_USER ?? env.ADMIN_USER)?.trim();
  const envAdminPass = (env.DEMO_ADMIN_PASS ?? env.ADMIN_PASS)?.trim();
  const envUserUser = (env.DEMO_USER_USER ?? env.USER_USER)?.trim();
  const envUserPass = (env.DEMO_USER_PASS ?? env.USER_PASS)?.trim();
  if (
    typeof envAdminUser === 'string' &&
    typeof envAdminPass === 'string' &&
    typeof envUserUser === 'string' &&
    typeof envUserPass === 'string'
  ) {
    return {
      adminUser: envAdminUser,
      adminPass: envAdminPass,
      userUser: envUserUser,
      userPass: envUserPass,
    };
  }

  // 3) Fallback defaults
  return { ...DEMO_DEFAULT };
}

/** นอร์มัลไลซ์ข้อความ */
function normalizeText(s: unknown): string {
  return typeof s === 'string' ? s.normalize('NFC').trim() : '';
}
function normalizeUser(s: unknown): string {
  return normalizeText(s).toLowerCase();
}
function normalizePass(s: unknown): string {
  return normalizeText(s);
}

/** เทียบสตริงแบบลด timing leak */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** คืนค่า JWT secret; ถ้าไม่มีให้ fallback ที่ชัดเจน */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const s = (env.JWT_SECRET ?? '').trim();
  return s.length > 0 ? s : 'change-me-in-prod';
}

/** DEMO login: รองรับทั้ง admin และ user */
export function login(
  username: unknown,
  password: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<User | null> {
  if (!isDemoLoginAllowed(env)) return Promise.resolve(null);

  const { adminUser, adminPass, userUser, userPass } = readDemoCreds(env);
  const uname = normalizeUser(username);
  const pword = normalizePass(password);

  if (
    uname === normalizeUser(adminUser) &&
    safeEqual(pword, normalizePass(adminPass))
  ) {
    return Promise.resolve({
      id: 1,
      username: normalizeUser(adminUser),
      role: 'admin',
    });
  }
  if (
    uname === normalizeUser(userUser) &&
    safeEqual(pword, normalizePass(userPass))
  ) {
    return Promise.resolve({
      id: 2,
      username: normalizeUser(userUser),
      role: 'user',
    });
  }
  return Promise.resolve(null);
}

/** ตรวจ match DEMO user ทั่วไป -> role 'demo' */
export function matchDemoUser(
  username: unknown,
  password: unknown,
  env: NodeJS.ProcessEnv = process.env,
): PublicUser | null {
  if (!isDemoLoginAllowed(env)) return null;
  const { userUser, userPass } = readDemoCreds(env);
  const ok =
    normalizeUser(username) === normalizeUser(userUser) &&
    safeEqual(normalizePass(password), normalizePass(userPass));
  return ok ? { id: 0, username: normalizeUser(userUser), role: 'demo' } : null;
}

/** มุมมอง public */
export function toPublicUser(u: User): PublicUser {
  return { id: u.id, username: u.username, role: u.role };
}

/** type guard สิทธิ์ admin */
export function isAdmin(
  u: User | null | undefined,
): u is User & { role: 'admin' } {
  return !!u && u.role === 'admin';
}
