const express = require('express');
const router = express.Router();

// Mock feature flags
const featureFlags = [
  {
    key: 'real-time-tracking',
    name: 'Real-time Tracking',
    description: 'Enable real-time GPS tracking updates',
    enabled: true,
    environment: ['development', 'production'],
    rolloutPercentage: 100
  },
  {
    key: 'geofence-alerts',
    name: 'Geofence Alerts',
    description: 'Enable geofence violation alerts',
    enabled: true,
    environment: ['development', 'production'],
    rolloutPercentage: 85
  },
  {
    key: 'temperature-monitoring',
    name: 'Temperature Monitoring',
    description: 'Monitor truck temperature sensors',
    enabled: true,
    environment: ['development', 'production'],
    rolloutPercentage: 90
  },
  {
    key: 'new-dashboard-ui',
    name: 'New Dashboard UI',
    description: 'Enable new dashboard interface',
    enabled: false,
    environment: ['development'],
    rolloutPercentage: 25
  }
];

// Get all feature flags
router.get('/', (req, res) => {
  res.json({
    success: true,
    flags: featureFlags
  });
});

// Check specific feature flag
router.get('/:key/check', (req, res) => {
  const flag = featureFlags.find(f => f.key === req.params.key);
  if (!flag) {
    return res.status(404).json({
      success: false,
      enabled: false,
      message: 'Feature flag not found'
    });
  }

  // Simple rollout logic
  const userHash = Math.random() * 100;
  const enabled = flag.enabled && userHash <= flag.rolloutPercentage;

  res.json({
    success: true,
    enabled,
    rolloutPercentage: flag.rolloutPercentage
  });
});

// Update feature flag
router.patch('/:key', (req, res) => {
  const flag = featureFlags.find(f => f.key === req.params.key);
  if (!flag) {
    return res.status(404).json({
      success: false,
      message: 'Feature flag not found'
    });
  }

  if (req.body.enabled !== undefined) {
    flag.enabled = req.body.enabled;
  }

  res.json({
    success: true,
    data: flag
  });
});

// Update rollout percentage
router.patch('/:key/rollout', (req, res) => {
  const flag = featureFlags.find(f => f.key === req.params.key);
  if (!flag) {
    return res.status(404).json({
      success: false,
      message: 'Feature flag not found'
    });
  }

  if (req.body.rolloutPercentage !== undefined) {
    flag.rolloutPercentage = Math.max(0, Math.min(100, req.body.rolloutPercentage));
  }

  res.json({
    success: true,
    data: flag
  });
});

module.exports = router;