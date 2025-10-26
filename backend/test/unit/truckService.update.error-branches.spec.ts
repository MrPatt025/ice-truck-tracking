// backend/test/unit/truckService.update.error-branches.spec.ts
import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import * as svc from '../../src/services/truckService';

const uniq = (p: string) =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('truckService.updateTruck branches', () => {
  it('returns null when target not found (object payload variant)', async () => {
    // เรียกแบบ object -> not found ต้องคืน null ตามสเปก service
    const r = await svc.updateTruck(999_999, { name: 'X' });
    expect(r).toBeNull();
  });

  it('handles conflict (P2002) and returns null', async () => {
    const a = await prisma.truck.create({ data: { name: uniq('A') } });
    const b = await prisma.truck.create({ data: { name: uniq('B') } });

    try {
      // ใช้รูปแบบ string ก็ได้: P2002 ใน service จะถูกแมปเป็น null
      const r = await svc.updateTruck(b.id, a.name); // ชน unique(name)
      expect(r).toBeNull();
    } finally {
      // ทำความสะอาด ไม่ทิ้งข้อมูลค้าง
      await prisma.truck.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    }
  });
});
