const db = require('./config/db');

async function cleanupOrphanedData() {
  try {
    console.log('🔍 กำลังตรวจสอบข้อมูล route_details ที่ไม่มี routes...');
    
    // ตรวจสอบข้อมูล route_details ที่ไม่มี routes อยู่แล้ว
    const [orphanedData] = await db.query(`
      SELECT rd.*, r.id as route_exists
      FROM route_details rd
      LEFT JOIN routes r ON rd.route_id = r.id
      WHERE r.id IS NULL
    `);
    
    console.log('📊 พบข้อมูล route_details ที่ไม่มี routes:', orphanedData.length, 'รายการ');
    
    if (orphanedData.length > 0) {
      console.log('🗑️ กำลังลบข้อมูล route_details ที่ไม่มี routes...');
      
      // ลบข้อมูล route_details ที่ไม่มี routes อยู่แล้ว
      const [result] = await db.query(`
        DELETE rd FROM route_details rd
        LEFT JOIN routes r ON rd.route_id = r.id
        WHERE r.id IS NULL
      `);
      
      console.log('✅ ลบข้อมูล route_details สำเร็จ:', result.affectedRows, 'รายการ');
    } else {
      console.log('✅ ไม่พบข้อมูล route_details ที่ต้องลบ');
    }
    
    // ตรวจสอบผลลัพธ์
    const [routeDetailsCount] = await db.query('SELECT COUNT(*) as count FROM route_details');
    const [routesCount] = await db.query('SELECT COUNT(*) as count FROM routes');
    
    console.log('📊 จำนวน route_details ที่เหลือ:', routeDetailsCount[0].count);
    console.log('📊 จำนวน routes ที่เหลือ:', routesCount[0].count);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    process.exit(0);
  }
}

cleanupOrphanedData();

