const { AppError } = require('./errorHandler');

// Simple validation without Joi
const validate = (schema) => {
  return (req, res, next) => {
    const { body } = req;
    
    // Basic validation for login
    if (schema.name === 'login') {
      if (!body.username || !body.password) {
        return next(new AppError('Username and password are required', 400));
      }
      if (body.username.length < 3) {
        return next(new AppError('Username must be at least 3 characters', 400));
      }
      if (body.password.length < 6) {
        return next(new AppError('Password must be at least 6 characters', 400));
      }
    }
    
    next();
  };
};

// Simple schemas
const schemas = {
  login: { name: 'login' },
  driver: { name: 'driver' },
  truck: { name: 'truck' },
  tracking: { name: 'tracking' },
  alert: { name: 'alert' },
  shop: { name: 'shop' }
};

module.exports = {
  validate,
  schemas
};