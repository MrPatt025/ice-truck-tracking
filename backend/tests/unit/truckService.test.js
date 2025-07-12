const truckService = require('../../src/services/truckService');

describe('TruckService', () => {
  it('should return an array from getAllTrucks', async () => {
    const trucks = await truckService.getAllTrucks();
    expect(Array.isArray(trucks)).toBe(true);
  });

  it('should return null for non-existent truck', async () => {
    const truck = await truckService.getTruckById(-1);
    expect(truck).toBeNull();
  });
});
