const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const truckService = require('../../services/truckService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const trucks = await truckService.getAllTrucks();
    res.status(200).json({
      status: 'success',
      results: trucks.length,
      data: trucks,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const truck = await truckService.getTruckById(req.params.id);
    if (!truck) {
      return next(new AppError('Truck not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: truck,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', restrictTo('admin'), validate(schemas.truck), async (req, res, next) => {
  try {
    const newTruck = await truckService.createTruck(req.body);
    res.status(201).json({
      status: 'success',
      data: newTruck,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
