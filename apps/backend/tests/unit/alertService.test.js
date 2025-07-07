const alertService = require('../../src/services/alertService');

describe('AlertService', () => {
  it('should return an array from getAllAlerts', async () => {
    const alerts = await alertService.getAllAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });
});
