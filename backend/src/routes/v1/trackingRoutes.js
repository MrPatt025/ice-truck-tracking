const express = require('express');
const { protect } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const TrackingService = require('../../services/tracking');
const { AppError } = require('../../middleware/error');

const router = express.Router();

// All tracking routes require authentication
router.use(protect);

// GET /api/v1/tracking/trucks — latest position for all trucks
router.get('/trucks', requirePermission('tracking:read'), async (req, res, next) => {
  try {
    const trucks = await TrackingService.getTrackingHistory();
    res.json({
      success: true,
      data: trucks,
      count: trucks.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tracking/trucks/:id — latest position for one truck
router.get('/trucks/:id', requirePermission('tracking:read'), async (req, res, next) => {
  try {
    const position = await TrackingService.getLatestPosition(req.params.id);
    if (!position) {
      return next(new AppError('Truck position not found', 404));
    }
    res.json({
      success: true,
      data: position,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tracking/history/:truckId — tracking history
router.get('/history/:truckId', requirePermission('tracking:read'), async (req, res, next) => {
  try {
    const { start, end } = req.query;
    let data;

    if (start && end) {
      data = await TrackingService.getTrackInTimeRange(req.params.truckId, start, end);
    } else {
      data = await TrackingService.getTrackingHistory({
        truck_id: req.params.truckId,
        limit: req.query.limit,
      });
    }

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tracking/location — submit a location update
router.post('/location', requirePermission('tracking:create'), async (req, res, next) => {
  try {
    const { truckId, latitude, longitude, speed, heading } = req.body;
    const record = await TrackingService.createTracking({
      truck_id: truckId,
      latitude,
      longitude,
      speed,
      heading,
    });
    res.status(201).json({
      success: true,
      message: 'Location updated successfully',
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tracking/bulk — bulk location update
router.post('/bulk', requirePermission('tracking:create'), async (req, res, next) => {
  try {
    const { data: locations } = req.body;
    if (!Array.isArray(locations)) {
      return next(new AppError('data must be an array of locations', 400));
    }
    const results = await Promise.all(
      locations.map((loc) =>
        TrackingService.createTracking({
          truck_id: loc.truckId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          heading: loc.heading,
        })
      )
    );
    res.status(201).json({
      success: true,
      message: `Updated ${results.length} locations`,
      processed: results.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
