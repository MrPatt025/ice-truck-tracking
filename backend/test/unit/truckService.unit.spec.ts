// backend/test/unit/truckService.unit.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, reset } from '../__mocks__/prisma.mock';
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import {
  getAllTrucks,
  getAllTrucksPaginated,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruck,
} from '../../src/services/truckService';

describe('truckService', () => {
  beforeEach(() => {
    reset();
  });

  it('createTruck success และ list ได้', async () => {
    const t = await createTruck('COV-TRK-001');
    expect(t.id).toBeGreaterThan(0);
    const list = await getAllTrucks();
    expect(list.some((x: { name: string }) => x.name === 'COV-TRK-001')).toBe(
      true,
    );
  });

  it('createTruck ซ้ำ -> โยน P2002', async () => {
    await createTruck('COV-TRK-002');
    await expect(createTruck('COV-TRK-002')).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('pagination + sorting asc', async () => {
    await createTruck('A-001');
    await createTruck('A-003');
    await createTruck('A-002');
    const page1 = await getAllTrucksPaginated({
      page: 1,
      limit: 2,
      sort: 'name',
      order: 'asc',
    });
    expect(page1.items.length).toBe(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);
    expect(page1.items[0].name <= page1.items[1].name).toBe(true);
  });

  it('get/update/delete by id ครบ flow', async () => {
    const t = await createTruck('COV-TRK-DEL');
    const found = await getTruckById(t.id);
    expect(found?.name).toBe('COV-TRK-DEL');

    const up = await updateTruck(t.id, { name: 'COV-TRK-DEL-2' });
    expect(up.name).toBe('COV-TRK-DEL-2');

    const del = await deleteTruck(t.id);
    expect(del.id).toBe(t.id);
    const after = await getTruckById(t.id);
    expect(after).toBeNull();
  });
});
