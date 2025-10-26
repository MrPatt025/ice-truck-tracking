// backend/test/unit/statsService.branches.unit.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks so the vi.mock factory can close over them
const { qrMock, alertFindManyMock, prismaMock } = vi.hoisted(() => {
  const qrMock = vi.fn(async () => [] as unknown[]);
  const alertFindManyMock = vi.fn(async () => [] as unknown[]);
  return {
    qrMock,
    alertFindManyMock,
    prismaMock: {
      $queryRaw: qrMock,
      alert: { findMany: alertFindManyMock },
    },
  };
});

// Replace prisma client used by the service with our lightweight mock
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock as any }));

import { getStats, type Range } from '../../src/services/statsService';

beforeEach(() => {
  qrMock.mockReset();
  alertFindManyMock.mockReset();
});

describe('statsService branches', () => {
  it('covers range switches and caching', async () => {
    // Arrange deterministic responses for the 8 expected $queryRaw calls
    // 1) activeTrucks count, 2) avg cargo temp, 3-6) temp buckets, 7) fleet rows, 8) alert rows
    let call = 0;
    qrMock.mockImplementation(async () => {
      call += 1;
      switch (call) {
        case 1:
          return [{ cnt: 2 }];
        case 2:
          return [{ avg: -6.5 }];
        case 3:
          return [{ c: 5 }];
        case 4:
          return [{ c: 10 }];
        case 5:
          return [{ c: 15 }];
        case 6:
          return [{ c: 2 }];
        case 7:
          // avgSpeed intentionally > 120 to exercise clamp()
          return [{ bucket: 'IGNORED', active: 2, avgSpeed: 150 }];
        case 8:
          return [{ bucket: 'IGNORED', info: 1, warning: 0, critical: 1 }];
        default:
          return [];
      }
    });
    alertFindManyMock.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ] as any);

    // Act: run through all supported ranges to hit branch cases in bucketFormat/step
    const ranges: Range[] = ['1h', '24h', '7d', '30d'];
    for (const r of ranges) {
      const res = await getStats(r);
      expect(res).toHaveProperty('summary');
      expect(res).toHaveProperty('revenueSeries');
      expect(Array.isArray(res.revenueSeries)).toBe(true);
      expect(res.lastCalc).toMatch(/T\d{2}:\d{2}:/);
    }

    // Cache hit should not trigger additional $queryRaw calls for same range
    const before = qrMock.mock.calls.length;
    const first = await getStats('24h');
    expect(first).toHaveProperty('summary');
    const mid = qrMock.mock.calls.length;
    const cached = await getStats('24h');
    expect(cached).toHaveProperty('summary');
    expect(qrMock.mock.calls.length).toBe(mid);
  });
});
