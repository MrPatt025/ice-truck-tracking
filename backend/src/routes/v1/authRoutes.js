const express = require('express');
const { login, register } = require('../../controllers/auth');
const { validate, schemas } = require('../../middleware/validation');
const { generalLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/login', generalLimiter, validate(schemas.login), login);
router.post('/register', generalLimiter, validate(schemas.register), register);

module.exports = router;
