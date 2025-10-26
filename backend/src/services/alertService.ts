// backend/src/services/alertService.ts
import { prisma } from '../lib/prisma';
import type { Prisma, Alert } from '@prisma/client';

/** Prisma error codes ที่ใช้ */
const PRISMA = {
  NOT_FOUND: 'P2025',
  FK_FAIL: 'P2003',
} as const;

/* ------------------------------ utils ------------------------------ */
function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

/** ดึง code จาก Prisma error แบบปลอดภัย */
function getErrCode(e: unknown): string | undefined {
  if (isObj(e) && typeof e.code === 'string') return e.code;
  return undefined;
}

function assertPositiveInt(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError('id must be a positive integer');
  }
}

/** trim แล้วคืน undefined ถ้า null/undefined, แต่ถ้าเป็นสตริงว่าง -> โยน error */
function normalizeMessage(m?: string | null): string | undefined {
  if (m == null) return undefined;
  const t = m.trim();
  if (!t) throw new TypeError('message cannot be empty');
  return t;
}

/** สำหรับ input ที่บังคับต้องเป็น string */
function normalizeMessageStrict(m: string): string {
  const t = m.trim();
  if (!t) throw new TypeError('message cannot be empty');
  return t;
}

/* ------------------------------ queries ------------------------------ */
/** รายการทั้งหมด เรียงตาม id เพื่อความเสถียร */
export function getAllAlerts(): Promise<Alert[]> {
  return prisma.alert.findMany({ orderBy: { id: 'asc' } });
}

export function getAlertById(id: number): Promise<Alert | null> {
  assertPositiveInt(id);
  return prisma.alert.findUnique({ where: { id } });
}

/* ------------------------------ commands ------------------------------ */
export function createAlert(data: Prisma.AlertCreateInput): Promise<Alert> {
  // ถ้ามี message ให้ trim และกันค่าว่าง
  const msg = normalizeMessage(
    typeof data.message === 'string' ? data.message : undefined,
  );
  const payload: Prisma.AlertCreateInput = {
    ...data,
    ...(msg !== undefined ? { message: msg } : {}),
  };
  return prisma.alert.create({ data: payload });
}

/**
 * สร้าง Alert ผูกกับ Truck
 * - สำเร็จ -> Alert
 * - FK ผิดหรือไม่พบ Truck (P2003/P2025) -> null
 */
export async function createAlertForTruck(
  truckId: number,
  level: Alert['level'],
  message: string,
): Promise<Alert | null> {
  assertPositiveInt(truckId);
  const msg = normalizeMessageStrict(message);

  try {
    return await prisma.alert.create({
      data: { level, message: msg, truck: { connect: { id: truckId } } },
    });
  } catch (err: unknown) {
    const code = getErrCode(err);
    if (code === PRISMA.FK_FAIL || code === PRISMA.NOT_FOUND) return null;
    throw err;
  }
}

/** ลบ alert: true เมื่อสำเร็จ, false เมื่อไม่พบ */
export async function deleteAlert(id: number): Promise<boolean> {
  assertPositiveInt(id);
  try {
    await prisma.alert.delete({ where: { id } });
    return true;
  } catch (err: unknown) {
    const code = getErrCode(err);
    if (code === PRISMA.NOT_FOUND) return false;
    throw err;
  }
}

/**
 * อัปเดตข้อความหรือระดับ:
 * - สำเร็จ -> Alert
 * - ไม่พบ -> null
 */
export async function updateAlert(
  id: number,
  data: Pick<Prisma.AlertUpdateInput, 'message' | 'level'>,
): Promise<Alert | null> {
  assertPositiveInt(id);

  // รองรับทั้งรูปแบบ string และ { set: string } สำหรับ message
  const payload: Pick<Prisma.AlertUpdateInput, 'message' | 'level'> = {
    ...data,
  };

  if (typeof payload.message === 'string') {
    const msg = normalizeMessage(payload.message);
    if (msg !== undefined) payload.message = msg;
  } else if (payload.message && typeof payload.message.set === 'string') {
    const setVal = payload.message.set;
    const msg = normalizeMessageStrict(setVal);
    payload.message = { set: msg };
  }

  try {
    return await prisma.alert.update({ where: { id }, data: payload });
  } catch (err: unknown) {
    const code = getErrCode(err);
    if (code === PRISMA.NOT_FOUND) return null;
    throw err;
  }
}
