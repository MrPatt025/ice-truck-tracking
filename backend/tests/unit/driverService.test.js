const driverService = require('../../src/services/driverService');

describe('DriverService', () => {
  it('should return an array from getAllDrivers', async () => {
    const drivers = await driverService.getAllDrivers();
    expect(Array.isArray(drivers)).toBe(true);
  });

  it('should return null for non-existent driver', async () => {
    const driver = await driverService.getDriverById(-1);
    expect(driver).toBeNull();
  });
});
