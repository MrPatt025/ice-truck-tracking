import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../__mocks__/prisma.mock';
vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { getAllAlerts, getAlertById } from '../../src/services/alertService';

describe('alertService', () => {
  it('list alert ได้และ getAlertById คืน null เมื่อไม่มี', async () => {
    const list = await getAllAlerts();
    expect(Array.isArray(list)).toBe(true);
    const one = await getAlertById?.(9999);
    expect(one).toBeNull();
  });
});
