import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock'; // ✅ แก้ path
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { createTruck, updateTruck } from '../../src/services/truckService';

describe('truckService.update conflict', () => {
  it('update เป็นชื่อที่ซ้ำ -> P2002', async () => {
    const a = await createTruck('UP-A');
    await createTruck('UP-B');
    // ✅ ให้ตรงกับลายเซ็นจริงของ service: (id: number, name: string)
    await expect(updateTruck(a.id, 'UP-B')).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
