const truckRepository = require('../repositories/truckRepository');

class TruckService {
    async getAllTrucks() {
        return truckRepository.getAll();
    }

    async getTruckById(id) {
        return truckRepository.getById(id);
    }

    async createTruck(truckData) {
        // สามารถเพิ่ม business validation logic ได้ที่นี่
        return truckRepository.create(truckData);
    }
}

module.exports = new TruckService(); 
