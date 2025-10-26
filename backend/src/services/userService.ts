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
  return parseBoolFlag(env.DEMO_LOGIN, true);
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
export function readDemoCreds(env: NodeJS.ProcessEnv = process.env) {
  const raw = (env.DEMO_CREDS ?? env.DEMO_CREDENTIALS)?.trim();
  if (!raw) return { ...DEMO_DEFAULT };
  try {
    const o = JSON.parse(raw) as unknown;
    if (o === null || typeof o !== 'object') return { ...DEMO_DEFAULT };

    const adminUser =
      firstStr(o, [['adminUser'], ['admin', 'username'], ['adminUsername']]) ??
      DEMO_DEFAULT.adminUser;
    const adminPass =
      firstStr(o, [['adminPass'], ['admin', 'password'], ['adminPassword']]) ??
      DEMO_DEFAULT.adminPass;
    const userUser =
      firstStr(o, [['userUser'], ['user', 'username'], ['userUsername']]) ??
      DEMO_DEFAULT.userUser;
    const userPass =
      firstStr(o, [['userPass'], ['user', 'password'], ['userPassword']]) ??
      DEMO_DEFAULT.userPass;

    return { adminUser, adminPass, userUser, userPass } as const;
  } catch {
    return { ...DEMO_DEFAULT };
  }
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
