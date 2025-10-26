import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock';
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import {
  createTruck,
  getAllTrucksPaginated,
  updateTruck,
  deleteTruck,
  getTruckById,
} from '../../src/services/truckService';

describe('truckService branches', () => {
  it('getAllTrucksPaginated: default branch (sort/order ไม่ส่งค่า)', async () => {
    await createTruck('BR-A');
    await createTruck('BR-B');
    const page = await getAllTrucksPaginated(
      1,
      10,
      undefined as any,
      undefined as any,
    );
    expect(page.items.length).toBeGreaterThan(0);
  });

  it('getAllTrucksPaginated: order "desc" branch', async () => {
    await createTruck('BR-C1');
    await createTruck('BR-C2');
    const page = await getAllTrucksPaginated(1, 10, 'name', 'desc');
    // ควรเรียงจากมากไปน้อย
    expect(page.items[0].name >= page.items[1].name).toBe(true);
  });

  it('updateTruck: generic-error branch (non-P2002)', async () => {
    const t = await createTruck('BR-U1');
    const spy = vi
      .spyOn(prismaMock.truck, 'update')
      .mockRejectedValueOnce(new Error('boom'));
    await expect(updateTruck(t.id, { name: 'X' })).rejects.toThrow('boom');
    spy.mockRestore();
  });

  it('deleteTruck: notfound branch', async () => {
    await expect(deleteTruck(999999)).rejects.toThrow();
  });

  it('getTruckById: notfound branch', async () => {
    const got = await getTruckById(888888);
    expect(got).toBeNull();
  });
});
