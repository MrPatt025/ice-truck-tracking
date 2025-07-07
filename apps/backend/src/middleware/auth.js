const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const config = require('../config/env');
const logger = require('../config/logger');

const signToken = (id, role) => {
  return jwt.sign({ id, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.role);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verification token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // 3) Check if user still exists (simplified for this example)
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = {
  signToken,
  createSendToken,
  protect,
  restrictTo,
};
