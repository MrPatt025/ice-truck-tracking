// backend/src/services/truckService.ts
import { Prisma } from '@prisma/client';
import type { Truck } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** ฟิลด์ที่อนุญาตให้ sort */
export type TruckSort = 'id' | 'name' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

const ALLOWED_SORTS = ['id', 'name', 'createdAt', 'updatedAt'] as const;

type TruckEntity = Truck;
type TruckOrderBy = Prisma.TruckOrderByWithRelationInput;

/* ------------------------------ utils ------------------------------ */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeOrder(order?: SortOrder): SortOrder {
  return order === 'desc' ? 'desc' : 'asc';
}

/** ถ้ามี order แต่ไม่มี sort -> ดีฟอลต์เป็น name (ให้ตรงสเปกเทสต์) */
function normalizeSort(sort: unknown, hasOrderOnly: boolean): TruckSort {
  const s = typeof sort === 'string' ? (sort as TruckSort) : 'id';
  if ((ALLOWED_SORTS as readonly string[]).includes(s)) return s;
  return hasOrderOnly ? 'name' : 'id';
}

function buildOrderBy(sort: TruckSort, order: SortOrder): TruckOrderBy {
  return { [sort]: order } as TruckOrderBy;
}

/* ----------------------- safe error helpers ------------------------ */
function isObjectLike(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Unknown error');
  }
}

/** อ่าน Prisma error code ให้ครอบคลุมทั้ง v6 และกรณี nested cause */
function extractPrismaCode(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code;
  }
  if (!isObjectLike(err)) return undefined;

  // direct
  const maybeCode = (err as { code?: unknown }).code;
  if (typeof maybeCode === 'string') return maybeCode;

  // nested cause
  const cause = (err as { cause?: unknown }).cause;
  if (isObjectLike(cause)) {
    const ccode = (cause as { code?: unknown }).code;
    if (typeof ccode === 'string') return ccode;
  }
  return undefined;
}

function safeString(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x instanceof Error) return x.message;
  return '';
}

function isUniqueViolation(err: unknown): boolean {
  return extractPrismaCode(err) === 'P2002';
}

// พรีคอมไพล์ regex สำหรับประสิทธิภาพ/ความชัดเจน
const NOT_FOUND_PATTERNS = [
  /no record was found/i,
  /record to (update|delete|upsert) not found/i,
  /operation failed because.*required but not found/i,
];

/** รองรับข้อความ not found ทุกรูปแบบของ Prisma */
function isNotFoundError(err: unknown): boolean {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    return true;
  }
  const code = extractPrismaCode(err);
  if (code === 'P2025') return true;

  let name: unknown;
  let message: unknown;
  let metaCause: unknown;

  if (isObjectLike(err)) {
    name = (err as { name?: unknown }).name;
    message = (err as { message?: unknown }).message;
    const meta = (err as { meta?: unknown }).meta;
    if (isObjectLike(meta)) metaCause = (meta as { cause?: unknown }).cause;
  }

  if (name === 'NotFoundError') return true;

  const hay = `${safeString(message)} ${safeString(metaCause)}`;
  return NOT_FOUND_PATTERNS.some((re) => re.test(hay));
}

function assertPositiveInt(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError('id must be a positive integer');
  }
}

/* ------------------------------ queries ------------------------------ */
export function getAllTrucks(): Promise<TruckEntity[]> {
  return prisma.truck.findMany({ orderBy: { id: 'asc' } });
}

type PaginateArgs = {
  page?: number;
  limit?: number;
  sort?: TruckSort;
  order?: SortOrder;
};
type PaginatedResult = {
  items: TruckEntity[];
  total: number;
  page: number;
  limit: number;
};

// overloads
export function getAllTrucksPaginated(
  args: PaginateArgs,
): Promise<PaginatedResult>;
export function getAllTrucksPaginated(
  page: number,
  limit?: number,
  sort?: TruckSort,
  order?: SortOrder,
): Promise<PaginatedResult>;

export async function getAllTrucksPaginated(
  arg1: PaginateArgs | number,
  limit?: number,
  sort?: TruckSort,
  order?: SortOrder,
): Promise<PaginatedResult> {
  const raw =
    typeof arg1 === 'number' ? { page: arg1, limit, sort, order } : arg1;

  const page = clamp(Math.trunc(raw.page ?? 1), 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = clamp(Math.trunc(raw.limit ?? 10), 1, 100);

  const hasOrder = typeof raw.order === 'string';
  const sortField = normalizeSort(raw.sort, !!(hasOrder && !raw.sort));
  const sortOrder = normalizeOrder(raw.order);

  const skip = (page - 1) * safeLimit;
  const take = safeLimit;

  const [items, total] = await Promise.all([
    prisma.truck.findMany({
      orderBy: buildOrderBy(sortField, sortOrder),
      skip,
      take,
    }),
    prisma.truck.count(),
  ]);

  return { items, total, page, limit: safeLimit };
}

export function getTruckById(id: number): Promise<TruckEntity | null> {
  assertPositiveInt(id);
  return prisma.truck.findUnique({ where: { id } });
}

/* ------------------------------ commands ------------------------------ */
export function createTruck(name: string): Promise<TruckEntity> {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new TypeError('name is required');
  return prisma.truck.create({ data: { name: trimmed } });
}

/**
 * อัปเดต:
 * - สำเร็จ -> Truck
 * - ชื่อซ้ำ (P2002) -> null
 * - ไม่พบ:
 *    - updateTruck(id, string) -> throw
 *    - updateTruck(id, { ... }) -> null
 * - ไม่มีฟิลด์ให้แก้ -> throw TypeError
 * - อื่น ๆ -> throw
 *
 * หมายเหตุ: เปิด exactOptionalPropertyTypes แล้ว "ห้ามส่ง undefined"
 */
export async function updateTruck(
  id: number,
  dataOrName: { name?: string } | string,
): Promise<TruckEntity | null> {
  assertPositiveInt(id);

  const throwOnNotFound = typeof dataOrName === 'string';

  const updateData: Prisma.TruckUpdateInput = {};
  if (typeof dataOrName === 'string') {
    const nm = dataOrName.trim();
    if (!nm) throw new TypeError('name cannot be empty');
    updateData.name = nm;
  } else if (Object.hasOwn(dataOrName, 'name')) {
    const nm = dataOrName.name;
    if (nm !== undefined) {
      const trimmed = nm.trim();
      if (!trimmed) throw new TypeError('name cannot be empty');
      updateData.name = trimmed;
    }
  }

  // ป้องกันกรณีส่ง {} แล้วไปเรียก update โดยไม่มี data จริง ๆ
  if (Object.keys(updateData).length === 0) {
    throw new TypeError('no fields to update');
  }

  try {
    return await prisma.truck.update({ where: { id }, data: updateData });
  } catch (err: unknown) {
    // ตามสเปก: P2002 (unique) -> null, P2025 (not found) ->
    //  - updateTruck(id, string) => throw
    //  - updateTruck(id, { ... }) => null
    const code = extractPrismaCode(err);
    if (code === 'P2002') return null;
    if (code === 'P2025') {
      if (throwOnNotFound) throw toError(err);
      return null;
    }

    // 1) เคสหลัก ๆ ตามสเปกเดิม (ยังคงรองรับข้อความ/โครงสร้าง error อื่น ๆ)
    if (isUniqueViolation(err)) return null;

    if (isNotFoundError(err)) {
      if (throwOnNotFound) throw toError(err);
      return null;
    }

    // 2) อื่น ๆ -> bubble
    throw toError(err);
  }
}

/**
 * ลบ:
 * - สำเร็จ -> true
 * - ไม่พบ (P2025/NotFound) -> throw (ให้ตรงสเปกเทสต์ notfound branch)
 * - อื่น ๆ -> throw
 */
export async function deleteTruck(id: number): Promise<boolean> {
  assertPositiveInt(id);
  try {
    await prisma.truck.delete({ where: { id } });
    return true;
  } catch (err: unknown) {
    if (isNotFoundError(err)) throw toError(err);
    throw toError(err);
  }
}
