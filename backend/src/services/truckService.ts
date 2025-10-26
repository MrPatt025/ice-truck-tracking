// backend/src/services/truckService.ts
import type { Prisma, Truck } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** ฟิลด์ที่อนุญาตให้ sort */
export type TruckSort = 'id' | 'name' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

const ALLOWED_SORTS = ['id', 'name', 'createdAt', 'updatedAt'] as const;

type TruckEntity = Truck;
type TruckOrderBy = Prisma.TruckOrderByWithRelationInput;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeOrder(order?: SortOrder): SortOrder {
  return order === 'desc' ? 'desc' : 'asc';
}

function normalizeSort(sort: unknown, hasOrderOnly: boolean): TruckSort {
  const s = typeof sort === 'string' ? (sort as TruckSort) : 'id';
  if ((ALLOWED_SORTS as readonly string[]).includes(s)) return s;
  // ถ้ามี order แต่ไม่มี sort -> ดีฟอลต์เป็น name ตามสเปคเทสต์
  return hasOrderOnly ? 'name' : 'id';
}

function buildOrderBy(sort: TruckSort, order: SortOrder): TruckOrderBy {
  return { [sort]: order } as TruckOrderBy;
}

function extractCode(e: unknown): string | undefined {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

function assertPositiveInt(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError('id must be a positive integer');
  }
}

/** ดึงทั้งหมด เรียงตาม id asc */
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
  const sortField = normalizeSort(raw.sort, hasOrder && !raw.sort);
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

export async function createTruck(name: string): Promise<TruckEntity> {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new TypeError('name is required');
  // ปล่อยให้ P2002 เด้งออกไปให้เลเยอร์บนแมปเป็น 409
  return prisma.truck.create({ data: { name: trimmed } });
}

/**
 * อัปเดต:
 * - สำเร็จ -> Truck
 * - ไม่พบ (P2025) -> null
 * - ชื่อซ้ำ (P2002) -> throw (ให้เลเยอร์บนตอบ 409)
 * - อื่น ๆ -> throw
 */
export async function updateTruck(
  id: number,
  dataOrName: { name?: string } | string,
): Promise<TruckEntity | null> {
  assertPositiveInt(id);

  const data =
    typeof dataOrName === 'string'
      ? { name: dataOrName.trim() }
      : { ...dataOrName, name: dataOrName.name?.trim() };

  if (data.name !== undefined && data.name.length === 0) {
    throw new TypeError('name cannot be empty');
  }

  try {
    return await prisma.truck.update({ where: { id }, data });
  } catch (err: unknown) {
    const code = extractCode(err);
    if (code === 'P2025') return null; // not found
    throw err;
  }
}

/**
 * ลบ:
 * - สำเร็จ -> คืน Truck ที่ถูกลบ
 * - ไม่พบ (P2025) -> null
 * - อื่น ๆ -> throw
 */
export async function deleteTruck(id: number): Promise<TruckEntity | null> {
  assertPositiveInt(id);
  try {
    return await prisma.truck.delete({ where: { id } });
  } catch (err: unknown) {
    const code = extractCode(err);
    if (code === 'P2025') return null;
    throw err;
  }
}
