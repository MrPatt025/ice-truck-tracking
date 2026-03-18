// routes/route.route.js
const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ✅ Debug endpoint - ไม่ต้องใช้ authentication
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug: กำลังดึงข้อมูลเส้นทาง...');
    const [routes] = await db.query(`
      SELECT r.*, 
             COUNT(rd.id) as shop_count,
             GROUP_CONCAT(DISTINCT rd.truck_id) as assigned_trucks
      FROM routes r
      LEFT JOIN route_details rd ON r.id = rd.route_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    console.log('✅ Debug: ข้อมูลเส้นทาง:', routes);
    res.json(routes);
  } catch (err) {
    console.error('❌ Debug: ดึงข้อมูลเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเส้นทางได้', error: err.message });
  }
});

// ✅ Debug endpoint สำหรับ trucks-shops - ไม่ต้องใช้ authentication
router.get('/debug/trucks-shops', async (req, res) => {
  try {
    console.log('🔍 Debug: กำลังดึงข้อมูลรถและร้านค้า...');
    const [trucks] = await db.query('SELECT truck_id as truck_code, license_plate, model, color FROM trucks ORDER BY truck_id');
    console.log('✅ Debug: ข้อมูลรถ:', trucks);
    const [shops] = await db.query('SELECT shop_id as shop_code, shop_name, address, lat as latitude, lng as longitude FROM shops ORDER BY shop_name');
    console.log('✅ Debug: ข้อมูลร้านค้า:', shops);
    
    res.json({ trucks, shops });
  } catch (err) {
    console.error('❌ Debug: ดึงข้อมูลรถและร้านค้าล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลได้', error: err.message });
  }
});

// ✅ GET: ดึงข้อมูลเส้นทางทั้งหมด
router.get('/', auth(['admin', 'owner', 'driver']), async (req, res) => {
  try {
    console.log('🔍 API: กำลังดึงข้อมูลเส้นทาง...');
    console.log('👤 User:', req.user);
    const [routes] = await db.query(`
      SELECT r.*, 
             COUNT(rd.id) as shop_count,
             GROUP_CONCAT(DISTINCT rd.truck_id) as assigned_trucks
      FROM routes r
      LEFT JOIN route_details rd ON r.id = rd.route_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    console.log('✅ API: ข้อมูลเส้นทาง:', routes);
    res.json(routes);
  } catch (err) {
    console.error('❌ API: ดึงข้อมูลเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเส้นทางได้', error: err.message });
  }
});

// ✅ GET: ดึงข้อมูลเส้นทางตาม ID พร้อมรายละเอียด
router.get('/:id', auth(['admin', 'owner']), async (req, res) => {
  try {
    const routeId = req.params.id;
    
    // ดึงข้อมูลเส้นทางหลัก
    const [routes] = await db.query(
      'SELECT id, route_name, description, created_at, updated_at FROM routes WHERE id = ? ORDER BY created_at DESC LIMIT 1',
      [routeId]
    );
    if (routes.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเส้นทางที่ต้องการ' });
    }

    // ดึงรายละเอียดเส้นทาง (รถและร้านค้า)
    const [details] = await db.query(`
      SELECT rd.*, 
             t.truck_id as truck_code, t.license_plate, t.model, t.color,
             s.shop_id as shop_code, s.shop_name, s.address, s.lat as latitude, s.lng as longitude
      FROM route_details rd
      LEFT JOIN trucks t ON rd.truck_id = t.truck_id
      LEFT JOIN shops s ON rd.shop_id = s.shop_id
      WHERE rd.route_id = ?
      ORDER BY rd.truck_id, rd.delivery_order
    `, [routeId]);

    res.json({
      route: routes[0],
      details: details
    });
  } catch (err) {
    console.error('❌ ดึงข้อมูลเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเส้นทางได้', error: err.message });
  }
});

// ✅ POST: สร้างเส้นทางใหม่
router.post('/', auth(['admin']), async (req, res) => {
  const { route_name, description, route_details } = req.body;

  if (!route_name || !route_details || !Array.isArray(route_details)) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อเส้นทางและรายละเอียด' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // สร้างเส้นทางหลัก
    const [result] = await connection.query(
      'INSERT INTO routes (route_name, description) VALUES (?, ?)',
      [route_name, description || null]
    );
    const routeId = result.insertId;

    // สร้างรายละเอียดเส้นทาง
    for (const detail of route_details) {
      const { truck_id, shop_id, delivery_order, estimated_time } = detail;
      
      if (!truck_id || !shop_id || !delivery_order) {
        throw new Error('ข้อมูลรายละเอียดเส้นทางไม่ครบถ้วน');
      }

      await connection.query(`
        INSERT INTO route_details (route_id, truck_id, shop_id, delivery_order, estimated_time)
        VALUES (?, ?, ?, ?, ?)
      `, [routeId, truck_id, shop_id, delivery_order, estimated_time || null]);
    }

    await connection.commit();
    res.json({ message: 'สร้างเส้นทางสำเร็จ', route_id: routeId });
  } catch (err) {
    await connection.rollback();
    console.error('❌ สร้างเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถสร้างเส้นทางได้', error: err.message });
  } finally {
    connection.release();
  }
});

// ✅ PUT: อัปเดตเส้นทาง
router.put('/:id', auth(['admin']), async (req, res) => {
  const routeId = req.params.id;
  const { route_name, description, route_details } = req.body;

  if (!route_name) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อเส้นทาง' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // ตรวจสอบว่าเส้นทางมีอยู่หรือไม่
    const [existing] = await connection.query('SELECT id FROM routes WHERE id = ?', [routeId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเส้นทางที่ต้องการแก้ไข' });
    }

    // อัปเดตเส้นทางหลัก
    await connection.query(
      'UPDATE routes SET route_name = ?, description = ? WHERE id = ?',
      [route_name, description || null, routeId]
    );

    // ลบรายละเอียดเก่า
    await connection.query('DELETE FROM route_details WHERE route_id = ?', [routeId]);

    // เพิ่มรายละเอียดใหม่
    if (route_details && Array.isArray(route_details)) {
      for (const detail of route_details) {
        const { truck_id, shop_id, delivery_order, estimated_time } = detail;
        
        if (!truck_id || !shop_id || !delivery_order) {
          throw new Error('ข้อมูลรายละเอียดเส้นทางไม่ครบถ้วน');
        }

        await connection.query(`
          INSERT INTO route_details (route_id, truck_id, shop_id, delivery_order, estimated_time)
          VALUES (?, ?, ?, ?, ?)
        `, [routeId, truck_id, shop_id, delivery_order, estimated_time || null]);
      }
    }

    await connection.commit();
    res.json({ message: 'อัปเดตเส้นทางสำเร็จ' });
  } catch (err) {
    await connection.rollback();
    console.error('❌ อัปเดตเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถอัปเดตเส้นทางได้', error: err.message });
  } finally {
    connection.release();
  }
});

// ✅ DELETE: ลบเส้นทาง
router.delete('/:id', auth(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const routeId = req.params.id;
    
    await connection.beginTransaction();
    
    // ตรวจสอบว่าเส้นทางมีอยู่หรือไม่
    const [existing] = await connection.query('SELECT id FROM routes WHERE id = ?', [routeId]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'ไม่พบเส้นทางที่ต้องการลบ' });
    }

    console.log('🗑️ กำลังลบเส้นทาง ID:', routeId);
    
    // ลบรายละเอียดเส้นทางก่อน (route_details)
    const [deletedDetails] = await connection.query('DELETE FROM route_details WHERE route_id = ?', [routeId]);
    console.log('🗑️ ลบ route_details จำนวน:', deletedDetails.affectedRows, 'รายการ');
    
    // ลบการมอบหมายเส้นทาง (route_assignments) ถ้ามี
    const [deletedAssignments] = await connection.query('DELETE FROM route_assignments WHERE route_id = ?', [routeId]);
    console.log('🗑️ ลบ route_assignments จำนวน:', deletedAssignments.affectedRows, 'รายการ');
    
    // ลบเส้นทางหลัก (routes)
    const [deletedRoute] = await connection.query('DELETE FROM routes WHERE id = ?', [routeId]);
    console.log('🗑️ ลบ routes จำนวน:', deletedRoute.affectedRows, 'รายการ');
    
    await connection.commit();
    console.log('✅ ลบเส้นทางและรายละเอียดทั้งหมดสำเร็จ');
    
    res.json({ 
      message: 'ลบเส้นทางสำเร็จ',
      deleted_route_details: deletedDetails.affectedRows,
      deleted_assignments: deletedAssignments.affectedRows,
      deleted_routes: deletedRoute.affectedRows
    });
  } catch (err) {
    await connection.rollback();
    console.error('❌ ลบเส้นทางล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถลบเส้นทางได้', error: err.message });
  } finally {
    connection.release();
  }
});

// ✅ GET: ดึงข้อมูลรถและร้านค้าที่สามารถใช้ได้
router.get('/data/trucks-shops', auth(['admin', 'owner', 'driver']), async (req, res) => {
  try {
    console.log('🔍 API: กำลังดึงข้อมูลรถและร้านค้า...');
    console.log('👤 User:', req.user);
    const [trucks] = await db.query('SELECT truck_id as truck_code, license_plate, model, color FROM trucks ORDER BY truck_id');
    console.log('✅ API: ข้อมูลรถ:', trucks);
    const [shops] = await db.query('SELECT shop_id as shop_code, shop_name, address, lat as latitude, lng as longitude FROM shops ORDER BY shop_name');
    console.log('✅ API: ข้อมูลร้านค้า:', shops);
    
    res.json({ trucks, shops });
  } catch (err) {
    console.error('❌ API: ดึงข้อมูลรถและร้านค้าล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลได้', error: err.message });
  }
});

// ✅ GET: ดึงข้อมูลเส้นทางของรถคันใดคันหนึ่ง
router.get('/truck/:truckId', auth(['admin', 'owner', 'driver']), async (req, res) => {
  try {
    const truckId = req.params.truckId;
    
    const [routes] = await db.query(`
      SELECT rd.*, 
             r.route_name, r.description,
             s.shop_id as shop_code, s.shop_name, s.address, s.lat as latitude, s.lng as longitude,
             ra.status as assignment_status, ra.assigned_date
      FROM route_details rd
      LEFT JOIN routes r ON rd.route_id = r.id
      LEFT JOIN shops s ON rd.shop_id = s.shop_id
      LEFT JOIN route_assignments ra ON rd.route_id = ra.route_id AND rd.truck_id = ra.truck_id
      WHERE rd.truck_id = ?
      ORDER BY ra.assigned_date DESC, rd.delivery_order
    `, [truckId]);

    res.json(routes);
  } catch (err) {
    console.error('❌ ดึงข้อมูลเส้นทางรถล้มเหลว:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเส้นทางรถได้', error: err.message });
  }
});

module.exports = router;
