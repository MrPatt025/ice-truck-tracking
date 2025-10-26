// แก้ import ให้ถูกตำแหน่งโฟลเดอร์
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock'; // เดิมใช้ ./__mocks__/prisma.mock ทำให้หาไม่เจอ
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { updateTruck } from '../../src/services/truckService';

describe('truckService notfound', () => {
  it('update ไม่พบ id + ส่ง string -> throw', async () => {
    await expect(updateTruck(999999, 'ANY')).rejects.toBeTruthy();
  });

  it('update ไม่พบ id + ส่ง object -> คืน null', async () => {
    await expect(updateTruck(999999, { name: 'X' })).resolves.toBeNull();
  });
});
