const express = require('express');
const authRoutes = require('./authRoutes');
const driverRoutes = require('./driverRoutes');
const truckRoutes = require('./truckRoutes');
const trackingRoutes = require('./trackingRoutes');
const alertRoutes = require('./alertRoutes');
const shopRoutes = require('./shopRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

// Health checks (no auth required)
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/drivers', driverRoutes);
router.use('/trucks', truckRoutes);
router.use('/tracking', trackingRoutes);
router.use('/alerts', alertRoutes);
router.use('/shops', shopRoutes);

module.exports = router;