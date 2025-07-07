const alertRepository = require('../repositories/alertRepository');

class AlertService {
  async getAllAlerts() {
    return alertRepository.getAll();
  }

  async createAlert(alertData) {
    // สามารถเพิ่ม business validation logic ได้ที่นี่
    return alertRepository.create(alertData);
  }
}

module.exports = new AlertService(); 
