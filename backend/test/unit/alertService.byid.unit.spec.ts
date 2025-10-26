import { describe, it, expect } from 'vitest';
import { createAlert, getAlertById } from '../../src/services/alertService';
import { createTruck } from '../../src/services/truckService';

describe('alertService getAlertById', () => {
  it('คืน null เมื่อไม่พบ', async () => {
    expect(await getAlertById(99999999)).toBeNull();
  });

  it('คืน object เมื่อมีจริง', async () => {
    const truck = await createTruck(`TEST-${Date.now()}`);
    const created = await createAlert({
      level: 'INFO',
      message: 'ok',
      truckId: truck.id,
    });
    const got = await getAlertById(created.id);
    expect(got?.id).toBe(created.id);
  });
});
