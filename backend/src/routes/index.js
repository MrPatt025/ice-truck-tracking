const express = require('express');
const router = express.Router();

router.use('/', require('./health.route'));
router.use('/auth', require('./auth.route'));
router.use('/drivers', require('./driver.route'));
router.use('/trucks', require('./truck.route'));
router.use('/shops', require('./shop.route'));
router.use('/tracking', require('./tracking.route'));
router.use('/alerts', require('./alert.route'));

module.exports = router;