const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const shops = await db.query('SELECT * FROM shops ORDER BY shop_name');
    res.status(200).json({
      status: 'success',
      results: shops.length,
      data: shops
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shops = await db.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
    
    if (shops.length === 0) {
      return next(new AppError('Shop not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: shops[0]
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', restrictTo('admin'), validate(schemas.shop), async (req, res, next) => {
  try {
    const result = await db.query(
      `INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.body.shop_code, req.body.shop_name, req.body.phone, req.body.address, req.body.latitude, req.body.longitude]
    );

    const newShop = await db.query('SELECT * FROM shops WHERE id = ?', [result.lastID]);

    res.status(201).json({
      status: 'success',
      data: newShop[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;