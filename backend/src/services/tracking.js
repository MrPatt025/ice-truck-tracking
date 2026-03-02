const trackingRepository = require('../repositories/trackingRepository');

class TrackingService {
  static async createTracking(data) {
    const { truck_id, latitude, longitude, speed, heading } = data;
    return trackingRepository.create({ truck_id, latitude, longitude, speed, heading });
  }

  static async getTrackingHistory(filters = {}) {
    if (filters.truck_id) {
      return trackingRepository.findByTruckId(filters.truck_id, {
        limit: filters.limit ? Number.parseInt(filters.limit) : 100,
      });
    }
    return trackingRepository.findLatestAll();
  }

  static async getLatestPosition(truckId) {
    return trackingRepository.findLatestByTruckId(truckId);
  }

  static async getTrackInTimeRange(truckId, startTime, endTime) {
    return trackingRepository.findInTimeRange(truckId, startTime, endTime);
  }

  static async getAggregated(truckId, intervalMinutes = 5) {
    return trackingRepository.getAggregated(truckId, intervalMinutes);
  }
}

module.exports = TrackingService;
