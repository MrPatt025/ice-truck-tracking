import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import * as svc from '../../src/services/truckService';

describe('truckService.updateTruck branches', () => {
  it('returns null when target not found', async () => {
    const r = await svc.updateTruck(999999, 'X');
    expect(r).toBeNull();
  });

  it('handles conflict (P2002) and returns null', async () => {
    const a = await prisma.truck.create({ data: { name: `A-${Date.now()}` } });
    const b = await prisma.truck.create({ data: { name: `B-${Date.now()}` } });
    const r = await svc.updateTruck(b.id, a.name); // ทำให้ชน unique
    expect(r).toBeNull();
  });
});
