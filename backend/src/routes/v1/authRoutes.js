const express = require('express');
const { login, register } = require('../../controllers/authController');
const { validate, schemas } = require('../../middleware/validation');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, validate(schemas.login), login);
router.post('/register', authLimiter, validate(schemas.login), register);

module.exports = router;
