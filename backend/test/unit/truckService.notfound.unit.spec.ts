// แก้ import ให้ถูกตำแหน่งโฟลเดอร์
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock'; // เดิมใช้ ./__mocks__/prisma.mock ทำให้หาไม่เจอ
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { updateTruck } from '../../src/services/truckService';

describe('truckService notfound', () => {
  it('update ไม่พบ id -> throw', async () => {
    // ฟังก์ชันจริงรับ string ไม่ใช่ object
    await expect(updateTruck(999999, 'ANY')).rejects.toBeTruthy();
  });
});
