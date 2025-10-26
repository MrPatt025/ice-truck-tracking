// backend/test/unit/truckService.update.conflict.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock'; // path ถูกต้อง
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { createTruck, updateTruck } from '../../src/services/truckService';

describe('truckService.update conflict', () => {
  it('อัปเดตชื่อซ้ำ -> ควรคืนค่า null (handle P2002)', async () => {
    const a = await createTruck('UP-A');
    await createTruck('UP-B');

    // ให้ตรงกับสัญญา service ปัจจุบัน: resolve เป็น null เมื่อชน unique
    const result = await updateTruck(a.id, 'UP-B');
    expect(result).toBeNull();
  });
});
