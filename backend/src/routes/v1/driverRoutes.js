const express = require('express');
const { protect } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { validate, schemas } = require('../../middleware/validation');
const driverService = require('../../services/driverService');
const { AppError } = require('../../middleware/error');

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
      data: drivers,
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
      data: driver,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/drivers (requires drivers:create permission)
router.post('/', requirePermission('drivers:create'), validate(schemas.driver), async (req, res, next) => {
  try {
    const newDriver = await driverService.createDriver(req.body);
    res.status(201).json({
      status: 'success',
      data: newDriver,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
