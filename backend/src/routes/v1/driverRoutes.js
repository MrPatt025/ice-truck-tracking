const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// GET /api/v1/drivers
router.get('/', async (req, res, next) => {
  try {
    const drivers = await db.query('SELECT * FROM drivers ORDER BY full_name');
    res.status(200).json({
      status: 'success',
      results: drivers.length,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/drivers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const drivers = await db.query('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    
    if (drivers.length === 0) {
      return next(new AppError('Driver not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: drivers[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/drivers (admin only)
router.post('/', restrictTo('admin'), validate(schemas.driver), async (req, res, next) => {
  try {
    const result = await db.query(
      `INSERT INTO drivers (driver_code, full_name, national_id, license_number, username, address, phone, start_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.body.driver_code, req.body.full_name, req.body.national_id, req.body.license_number, 
       req.body.username, req.body.address, req.body.phone, req.body.start_date]
    );

    const newDriver = await db.query('SELECT * FROM drivers WHERE id = ?', [result.lastID]);

    res.status(201).json({
      status: 'success',
      data: newDriver[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;