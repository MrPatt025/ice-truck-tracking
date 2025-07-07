const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const driverService = require('../../services/driverService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// GET /api/v1/drivers
router.get('/', async (req, res, next) => {
  try {
    const drivers = await driverService.getAllDrivers();
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
    const driver = await driverService.getDriverById(req.params.id);
    if (!driver) {
      return next(new AppError('Driver not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: driver
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/drivers (admin only)
router.post('/', restrictTo('admin'), validate(schemas.driver), async (req, res, next) => {
  try {
    const newDriver = await driverService.createDriver(req.body);
    res.status(201).json({
      status: 'success',
      data: newDriver
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
