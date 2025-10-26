// backend/test/unit/truckService.update.unknown-error.spec.ts
import { describe, it, expect, vi } from 'vitest';

// Hoisted prisma mock providing only the needed update method
const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      truck: {
        update: vi.fn(async () => {
          const err: any = { cause: {} };
          // Create a circular structure to make JSON.stringify throw
          err.cause.self = err;
          throw err;
        }),
      },
    },
  };
});

vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock as any }));

import { updateTruck } from '../../src/services/truckService';

describe('truckService.updateTruck unknown error path', () => {
  it('throws an Error("Unknown error") when err is not serializable', async () => {
    await expect(updateTruck(1, 'Name')).rejects.toMatchObject({
      message: 'Unknown error',
    });
  });
});
