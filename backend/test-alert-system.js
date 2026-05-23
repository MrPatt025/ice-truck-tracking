// test-alert-system.js
// ไฟล์ทดสอบระบบแจ้งเตือนอัตโนมัติ

const AlertService = require('./services/alertService');

async function testAlertSystem() {
  // ทดสอบ 1: รถออกนอกเส้นทาง
  const testLocation = { latitude: 13.7563, longitude: 100.5018 }; // กรุงเทพ
  const testRoute = [
    { latitude: 13.7367, longitude: 100.5231 }, // จุดที่ 1
    { latitude: 13.7467, longitude: 100.5131 }, // จุดที่ 2
  ];

  try {
    await AlertService.checkOffRoute('TEST001', testLocation, testRoute);
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการทดสอบรถออกนอกเส้นทาง:', error.message);
  }

  // ทดสอบ 2: รถจอดอยู่นานเกินไป
  const oldTime = new Date(Date.now() - 35 * 60 * 1000); // 35 นาทีที่แล้ว

  try {
    await AlertService.checkIdleTooLong('TEST002', oldTime, 30);
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการทดสอบรถจอดอยู่นานเกินไป:', error.message);
  }

  // ทดสอบ 3: รถขับเร็วเกินกำหนด
  const highSpeed = 90; // 90 กม./ชม.

  try {
    await AlertService.checkSpeedExceeded('TEST003', highSpeed, 80);
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการทดสอบรถขับเร็วเกินกำหนด:', error.message);
  }

  // ทดสอบ 4: ระบบตรวจสอบทั้งหมด
  const trackingData = {
    location: testLocation,
    route: testRoute,
    lastMovementTime: oldTime,
    speed: highSpeed,
  };

  try {
    await AlertService.runAllChecks('TEST004', trackingData);
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการทดสอบระบบตรวจสอบทั้งหมด:', error.message);
  }
}

// รันการทดสอบ
if (require.main === module) {
  testAlertSystem()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
      process.exit(1);
    });
}

module.exports = { testAlertSystem };
