import { expect, test, vi } from 'vitest';
import { prismaMock } from './__mocks__/../__mocks__/prisma.mock';
vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));

import { getAlertById } from '../src/services/alertService';

test('alerts > getAlertById null branch', async () => {
  const res = await getAlertById?.(99999);
  expect(res).toBeNull(); // ครอบเคสไม่พบ
});
