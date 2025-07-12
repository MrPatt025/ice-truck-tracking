const express = require('express');
const router = express.Router();

// Mock mobile devices
const mobileDevices = new Map();

// Register mobile device
router.post('/register', (req, res) => {
  const { deviceId, deviceInfo } = req.body;

  mobileDevices.set(deviceId, {
    ...deviceInfo,
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: 'active',
  });

  res.json({
    success: true,
    message: 'Device registered successfully',
    deviceId,
  });
});

// Get device status
router.get('/device/:deviceId', (req, res) => {
  const device = mobileDevices.get(req.params.deviceId);

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found',
    });
  }

  res.json({
    success: true,
    device,
  });
});

// Update device location
router.post('/location', (req, res) => {
  const { deviceId, latitude, longitude, accuracy, timestamp } = req.body;

  if (mobileDevices.has(deviceId)) {
    const device = mobileDevices.get(deviceId);
    device.lastLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp,
    };
    device.lastSeen = new Date().toISOString();
  }

  // Also update truck location if truckId provided
  if (req.body.truckId) {
    // This would normally update the truck in database
    console.log(`Mobile device ${deviceId} updated truck ${req.body.truckId} location`);
  }

  res.json({
    success: true,
    message: 'Location updated successfully',
    timestamp: new Date().toISOString(),
  });
});

// Get all active devices
router.get('/devices', (req, res) => {
  const devices = Array.from(mobileDevices.entries()).map(([id, device]) => ({
    deviceId: id,
    ...device,
  }));

  res.json({
    success: true,
    devices,
    count: devices.length,
  });
});

// Test connectivity
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile API is working',
    timestamp: new Date().toISOString(),
    server: 'Ice Truck Tracking API',
  });
});

// Simulate offline sync
router.post('/sync', (req, res) => {
  const { deviceId, locations } = req.body;

  if (!Array.isArray(locations)) {
    return res.status(400).json({
      success: false,
      message: 'Locations must be an array',
    });
  }

  // Process each location
  locations.forEach(location => {
    console.log(`Syncing location for device ${deviceId}:`, location);
  });

  res.json({
    success: true,
    message: `Synced ${locations.length} locations`,
    processed: locations.length,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
