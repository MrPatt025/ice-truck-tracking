const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const trucks = await db.query('SELECT * FROM trucks ORDER BY truck_code');
    res.status(200).json({
      status: 'success',
      results: trucks.length,
      data: trucks
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const trucks = await db.query('SELECT * FROM trucks WHERE id = ?', [req.params.id]);
    
    if (trucks.length === 0) {
      return next(new AppError('Truck not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: trucks[0]
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', restrictTo('admin'), validate(schemas.truck), async (req, res, next) => {
  try {
    const result = await db.query(
      `INSERT INTO trucks (truck_code, plate_number, model, color, gps_code) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.body.truck_code, req.body.plate_number, req.body.model, req.body.color, req.body.gps_code]
    );

    const newTruck = await db.query('SELECT * FROM trucks WHERE id = ?', [result.lastID]);

    res.status(201).json({
      status: 'success',
      data: newTruck[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;