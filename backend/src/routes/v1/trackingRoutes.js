const express = require('express');
const { protect } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const db = require('../../config/database');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const tracking = await db.query(`
      SELECT t.*, d.full_name as driver_name, tr.plate_number, s.shop_name
      FROM tracking t
      LEFT JOIN drivers d ON t.driver_code = d.driver_code
      LEFT JOIN trucks tr ON t.truck_code = tr.truck_code
      LEFT JOIN shops s ON t.shop_code = s.shop_code
      ORDER BY t.timestamp DESC
      LIMIT 100
    `);
    
    res.status(200).json({
      status: 'success',
      results: tracking.length,
      data: tracking
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(schemas.tracking), async (req, res, next) => {
  try {
    const { shop_code, truck_code, driver_code, gps_code, latitude, longitude } = req.body;
    
    const result = await db.query(
      `INSERT INTO tracking (shop_code, truck_code, driver_code, gps_code, latitude, longitude, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [shop_code, truck_code, driver_code, gps_code, latitude, longitude]
    );

    const newTracking = await db.query('SELECT * FROM tracking WHERE id = ?', [result.lastID]);

    res.status(201).json({
      status: 'success',
      data: newTracking[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;