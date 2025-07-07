const express = require('express');
const router = express.Router();

// Mock data for demo
const mockTrucks = [
  {
    id: '1',
    plate_number: 'ABC-123',
    latitude: 13.7563,
    longitude: 100.5018,
    status: 'active',
    driver_name: 'John Doe',
    temperature: -2.5,
    speed: 45,
    last_update: new Date().toISOString()
  },
  {
    id: '2', 
    plate_number: 'XYZ-789',
    latitude: 13.7600,
    longitude: 100.5100,
    status: 'inactive',
    driver_name: 'Jane Smith',
    temperature: -1.8,
    speed: 0,
    last_update: new Date().toISOString()
  }
];

// Get all trucks
router.get('/trucks', (req, res) => {
  res.json({
    success: true,
    data: mockTrucks,
    count: mockTrucks.length
  });
});

// Track location
router.post('/location', (req, res) => {
  const { truckId, latitude, longitude, temperature, speed } = req.body;
  
  // Update mock data
  const truck = mockTrucks.find(t => t.id === truckId);
  if (truck) {
    truck.latitude = latitude;
    truck.longitude = longitude;
    truck.temperature = temperature || truck.temperature;
    truck.speed = speed || truck.speed;
    truck.last_update = new Date().toISOString();
    truck.status = 'active';
  }

  res.json({
    success: true,
    message: 'Location updated successfully',
    data: { truckId, latitude, longitude, timestamp: new Date().toISOString() }
  });
});

// Bulk location update
router.post('/bulk', (req, res) => {
  const { data: locations } = req.body;
  
  locations.forEach(location => {
    const truck = mockTrucks.find(t => t.id === location.truckId);
    if (truck) {
      truck.latitude = location.latitude;
      truck.longitude = location.longitude;
      truck.temperature = location.temperature || truck.temperature;
      truck.speed = location.speed || truck.speed;
      truck.last_update = new Date().toISOString();
      truck.status = 'active';
    }
  });

  res.json({
    success: true,
    message: `Updated ${locations.length} locations`,
    processed: locations.length
  });
});

// Get truck by ID
router.get('/trucks/:id', (req, res) => {
  const truck = mockTrucks.find(t => t.id === req.params.id);
  if (!truck) {
    return res.status(404).json({
      success: false,
      message: 'Truck not found'
    });
  }

  res.json({
    success: true,
    data: truck
  });
});

module.exports = router;