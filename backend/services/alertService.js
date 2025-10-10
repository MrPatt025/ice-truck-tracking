// services/alertService.js
const db = require('../config/db');

class AlertService {
  // ตรวจสอบรถออกนอกเส้นทาง
  static async checkOffRoute(truckCode, currentLocation, routeLocations) {
    try {
      const isOffRoute = this.calculateDistanceFromRoute(currentLocation, routeLocations) > 0.5; // 500 เมตร
      
      if (isOffRoute) {
        await this.createSystemAlert({
          truck_code: truckCode,
          type: 'off_route',
          message: `รถหมายเลข ${truckCode} ออกนอกเส้นทางที่กำหนดไว้`,
          location: currentLocation
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking off route:', error);
      return false;
    }
  }

  // ตรวจสอบรถจอดอยู่นานเกินไป
  static async checkIdleTooLong(truckCode, lastMovementTime, idleThresholdMinutes = 30) {
    try {
      const now = new Date();
      const timeDiff = (now - new Date(lastMovementTime)) / (1000 * 60); // นาที
      
      if (timeDiff > idleThresholdMinutes) {
        await this.createSystemAlert({
          truck_code: truckCode,
          type: 'idle_too_long',
          message: `รถหมายเลข ${truckCode} จอดอยู่นานเกิน ${idleThresholdMinutes} นาที`,
          location: null
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking idle time:', error);
      return false;
    }
  }

  // ตรวจสอบความเร็วเกินกำหนด
  static async checkSpeedExceeded(truckCode, currentSpeed, speedLimit = 80) {
    try {
      if (currentSpeed > speedLimit) {
        await this.createSystemAlert({
          truck_code: truckCode,
          type: 'speed_exceeded',
          message: `รถหมายเลข ${truckCode} ขับเร็วเกินกำหนด (${currentSpeed} กม./ชม.)`,
          location: null
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking speed:', error);
      return false;
    }
  }

  // ตรวจสอบการบำรุงรักษา
  static async checkMaintenanceDue(truckCode) {
    try {
      const [rows] = await db.query(`
        SELECT last_maintenance, maintenance_interval_days 
        FROM trucks 
        WHERE truck_code = ?
      `, [truckCode]);

      if (rows.length > 0) {
        const { last_maintenance, maintenance_interval_days } = rows[0];
        const lastMaintenanceDate = new Date(last_maintenance);
        const nextMaintenanceDate = new Date(lastMaintenanceDate);
        nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + maintenance_interval_days);
        
        const now = new Date();
        if (now >= nextMaintenanceDate) {
          await this.createSystemAlert({
            truck_code: truckCode,
            type: 'maintenance_due',
            message: `รถหมายเลข ${truckCode} ถึงกำหนดเข้าซ่อมบำรุงแล้ว`,
            location: null
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking maintenance:', error);
      return false;
    }
  }

  // สร้างการแจ้งเตือนระบบ
  static async createSystemAlert({ truck_code, type, message, location }) {
    try {
      const locationData = location ? JSON.stringify(location) : null;
      await db.query(
        'INSERT INTO alerts (truck_code, type, message, alert_time, location_data) VALUES (?, ?, ?, ?, ?)',
        [truck_code, type, message, new Date(), locationData]
      );
      console.log(`System alert created: ${type} for truck ${truck_code}`);
    } catch (error) {
      console.error('Error creating system alert:', error);
    }
  }

  // คำนวณระยะทางจากเส้นทาง
  static calculateDistanceFromRoute(currentLocation, routeLocations) {
    if (!routeLocations || routeLocations.length === 0) return 0;
    
    let minDistance = Infinity;
    
    for (const routePoint of routeLocations) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        routePoint.latitude,
        routePoint.longitude
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  // คำนวณระยะทางระหว่างจุดสองจุด (Haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // รัศมีโลกในกิโลเมตร
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // ระยะทางในกิโลเมตร
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // ตรวจสอบการแจ้งเตือนทั้งหมด
  static async runAllChecks(truckCode, trackingData) {
    try {
      const checks = [];
      
      // ตรวจสอบรถออกนอกเส้นทาง
      if (trackingData.location && trackingData.route) {
        checks.push(this.checkOffRoute(truckCode, trackingData.location, trackingData.route));
      }
      
      // ตรวจสอบรถจอดอยู่นานเกินไป
      if (trackingData.lastMovementTime) {
        checks.push(this.checkIdleTooLong(truckCode, trackingData.lastMovementTime));
      }
      
      // ตรวจสอบความเร็วเกินกำหนด
      if (trackingData.speed) {
        checks.push(this.checkSpeedExceeded(truckCode, trackingData.speed));
      }
      
      // ตรวจสอบการบำรุงรักษา
      checks.push(this.checkMaintenanceDue(truckCode));
      
      await Promise.all(checks);
    } catch (error) {
      console.error('Error running alert checks:', error);
    }
  }
}

module.exports = AlertService;
