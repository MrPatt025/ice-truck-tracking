import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { getAllTrucksPaginated } from '../../src/services/truckService';

describe('truckService sort/order branches', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(prisma.truck, 'findMany').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps sort=createdAt, order=asc', async () => {
    await getAllTrucksPaginated({
      page: 1,
      limit: 10,
      sort: 'createdAt',
      order: 'asc',
    });
    const args = (spy.mock.calls.at(-1)?.[0] ?? {}) as any;
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
  });

  it('maps sort=updatedAt, order=asc', async () => {
    await getAllTrucksPaginated({
      page: 1,
      limit: 10,
      sort: 'updatedAt',
      order: 'asc',
    });
    const args = (spy.mock.calls.at(-1)?.[0] ?? {}) as any;
    expect(args.orderBy).toEqual({ updatedAt: 'asc' });
  });

  it('fallbacks unknown sort -> id asc', async () => {
    await getAllTrucksPaginated({
      page: 1,
      limit: 10,
      sort: '__weird__' as any,
      order: 'asc',
    });
    const args = (spy.mock.calls.at(-1)?.[0] ?? {}) as any;
    expect(args.orderBy).toEqual({ id: 'asc' });
  });

  it('fallbacks unknown order -> asc', async () => {
    await getAllTrucksPaginated({
      page: 1,
      limit: 10,
      sort: 'name',
      order: '__weird__' as any,
    });
    const args = (spy.mock.calls.at(-1)?.[0] ?? {}) as any;
    expect(args.orderBy).toEqual({ name: 'asc' });
  });
});
