// backend/test/unit/alertService.branches.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// สร้าง mock แบบ hoisted ให้ใช้ได้ภายใน factory ของ vi.mock
const { prismaMock, alertFindUnique, alertCreate } = vi.hoisted(() => {
  const alertFindUnique = vi.fn();
  const alertCreate = vi.fn();
  return {
    alertFindUnique,
    alertCreate,
    prismaMock: {
      alert: {
        findUnique: alertFindUnique,
        create: alertCreate,
      },
    },
  };
});

// mock โมดูล prisma โดยอ้างถึงตัวแปรที่ hoisted แล้วเท่านั้น
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock as any }));

import { getAlertById, createAlert } from '../../src/services/alertService';

beforeEach(() => {
  alertFindUnique.mockReset();
  alertCreate.mockReset();
});

describe('alertService branches', () => {
  it('getAlertById returns null when missing', async () => {
    alertFindUnique.mockResolvedValueOnce(null);
    const r = await getAlertById(99999);
    expect(r).toBeNull();
    expect(alertFindUnique).toHaveBeenCalledTimes(1);
  });

  it('getAlertById returns a record when found', async () => {
    const fake = {
      id: 1,
      level: 'INFO',
      message: 'x',
      truckId: 1,
      createdAt: new Date(),
    };
    alertFindUnique.mockResolvedValueOnce(fake as any);
    const r = await getAlertById(1);
    expect(r).toEqual(fake);
    expect(alertFindUnique).toHaveBeenCalledTimes(1);
  });

  it('createAlert success', async () => {
    const fake = {
      id: 2,
      level: 'INFO',
      message: 'ok',
      truckId: 1,
      createdAt: new Date(),
    };
    alertCreate.mockResolvedValueOnce(fake as any);
    const r = await createAlert({ level: 'INFO', message: 'ok', truckId: 1 });
    expect(r).toEqual(fake);
    expect(alertCreate).toHaveBeenCalledTimes(1);
  });
});
