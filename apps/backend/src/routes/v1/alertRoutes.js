const express = require('express');
const { protect } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const db = require('../../config/database');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const alerts = await db.query(`
      SELECT a.*, d.full_name as driver_name, t.plate_number
      FROM alerts a
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN trucks t ON a.truck_id = t.id
      ORDER BY a.alert_time DESC
    `);
    
    res.status(200).json({
      status: 'success',
      results: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(schemas.alert), async (req, res, next) => {
  try {
    const { truck_id, driver_id, message, alert_type } = req.body;
    
    const result = await db.query(
      `INSERT INTO alerts (truck_id, driver_id, message, alert_type, alert_time) 
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [truck_id, driver_id, message, alert_type]
    );

    const newAlert = await db.query('SELECT * FROM alerts WHERE id = ?', [result.lastID]);

    res.status(201).json({
      status: 'success',
      data: newAlert[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;