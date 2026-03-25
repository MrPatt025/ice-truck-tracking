const { createSendToken } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const userService = require('../services/userService');
const logger = require('../config/logger');

const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    let identifier = null;
    if (typeof username === 'string' && username.trim().length > 0) {
      identifier = username.trim();
    } else if (typeof email === 'string' && email.trim().length > 0) {
      identifier = email.trim();
    }

    if (!identifier || !password) {
      return next(new AppError('Please provide username/email and password!', 400));
    }

    const user = await userService.login(identifier, password);
    if (!user) {
      logger.warn(`Failed login attempt for username: ${identifier}`);
      return next(new AppError('Incorrect username or password', 401));
    }

    logger.info(`Successful login for user: ${identifier}`);
    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      name,
      full_name,
      phone,
      company,
      password,
      role = 'driver',
    } = req.body;
    const newUser = await userService.register({
      username,
      email,
      name,
      full_name,
      phone,
      company,
      password,
      role,
    });
    logger.info(`New user registered: ${newUser?.username || username || email}`);
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
  register,
};
