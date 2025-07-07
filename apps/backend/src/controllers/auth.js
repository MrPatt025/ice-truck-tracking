const bcrypt = require('bcrypt');
const { createSendToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const userService = require('../services/userService');
const logger = require('../config/logger');
const config = require('../config/env');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return next(new AppError('Please provide username and password!', 400));
    }
    const user = await userService.login(username, password);
    if (!user) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return next(new AppError('Incorrect username or password', 401));
    }
    logger.info(`Successful login for user: ${username}`);
    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, password, role = 'driver' } = req.body;
    const newUser = await userService.register({ username, password, role });
    logger.info(`New user registered: ${username}`);
    createSendToken(newUser, 201, res);
  } catch (error) {
    logger.error('Registration error:', error);
    if (error.message === 'Username already exists') {
      return next(new AppError('Username already exists', 400));
    }
    next(error);
  }
};

module.exports = {
  login,
  register
};
