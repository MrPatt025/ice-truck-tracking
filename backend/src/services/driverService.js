const driverRepository = require('../repositories/driverRepository');

class DriverService {
  async getAllDrivers() {
    return driverRepository.getAll();
  }

  async getDriverById(id) {
    return driverRepository.getById(id);
  }

  async createDriver(driverData) {
    // สามารถเพิ่ม business validation logic ได้ที่นี่
    return driverRepository.create(driverData);
  }
}

module.exports = new DriverService();
