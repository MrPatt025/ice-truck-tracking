const express = require('express');
const {
  healthCheck,
  readinessCheck,
  livenessCheck,
} = require('../../controllers/healthController');

const router = express.Router();

router.get('/', healthCheck);
router.get('/healthz', healthCheck);
router.get('/readyz', readinessCheck);
router.get('/livez', livenessCheck);

module.exports = router;
