const express = require('express');
const { protect } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const alertService = require('../../services/alertService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const alerts = await alertService.getAllAlerts();
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
    const newAlert = await alertService.createAlert(req.body);
    res.status(201).json({
      status: 'success',
      data: newAlert
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
