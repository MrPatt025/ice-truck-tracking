import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import * as svc from '../../src/services/truckService';

describe('truckService.deleteTruck', () => {
  it('deletes existing and returns true', async () => {
    const t = await prisma.truck.create({
      data: { name: `DEL-${Date.now()}` },
    });
    const ok = await svc.deleteTruck(t.id);
    expect(ok).toBe(true);
  });
});
