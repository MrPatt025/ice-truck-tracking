const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { trackingValidation } = require('../middleware/validation');
const TrackingService = require('../services/trackingService');

router.get('/', auth(), async (req, res, next) => {
  try {
    const filters = { truck_code: req.query.truck_code, limit: req.query.limit || 50 };
    const data = await TrackingService.getTrackingHistory(filters);
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth(), async (req, res, next) => {
  try {
    const result = await TrackingService.createTracking(req.body);
    res.status(201).json({ success: true, message: 'GPS tracking data saved successfully', id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.get('/latest/:truck_code', auth(), async (req, res, next) => {
  try {
    const position = await TrackingService.getLatestPosition(req.params.truck_code);
    if (!position) return res.status(404).json({ success: false, message: 'No tracking data found' });
    res.json({ success: true, data: position });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
