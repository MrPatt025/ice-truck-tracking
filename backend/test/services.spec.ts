import { describe, it, expect } from 'vitest';
import * as truckService from '../src/services/truckService';
import * as alertService from '../src/services/alertService';

describe('services direct', () => {
  it('truckService.getAllTrucks returns array', async () => {
    const list = await truckService.getAllTrucks();
    expect(Array.isArray(list)).toBe(true);
  });

  it('alertService.getAllAlerts returns array', async () => {
    const list = await alertService.getAllAlerts();
    expect(Array.isArray(list)).toBe(true);
  });
});
