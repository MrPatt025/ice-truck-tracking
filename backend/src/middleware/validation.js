const { AppError } = require('./error');

// Simple validation without Joi
const validate = schema => {
  return (req, res, next) => {
    const { body } = req;

    // Basic validation for login
    if (schema.name === 'login') {
      let identifier = null;
      if (typeof body.username === 'string' && body.username.trim().length > 0) {
        identifier = body.username.trim();
      } else if (typeof body.email === 'string' && body.email.trim().length > 0) {
        identifier = body.email.trim();
      }

      if (!identifier || !body.password) {
        return next(new AppError('Username/email and password are required', 400));
      }

      if (identifier.length < 3) {
        return next(new AppError('Username/email must be at least 3 characters', 400));
      }

      if (body.password.length < 6) {
        return next(new AppError('Password must be at least 6 characters', 400));
      }
    }

    if (schema.name === 'register') {
      const hasValidUsername = typeof body.username === 'string' && body.username.trim().length >= 3;
      const hasValidEmail =
        typeof body.email === 'string' && body.email.trim().length >= 5 && body.email.includes('@');

      if (!hasValidUsername && !hasValidEmail) {
        return next(new AppError('Username or valid email is required', 400));
      }

      if (typeof body.password !== 'string' || body.password.length < 6) {
        return next(new AppError('Password must be at least 6 characters', 400));
      }

      if (body.email !== undefined) {
        if (!hasValidEmail) {
          return next(new AppError('Email must be a valid email address', 400));
        }
      }
    }

    next();
  };
};

// Simple schemas
const schemas = {
  login: { name: 'login' },
  register: { name: 'register' },
  driver: { name: 'driver' },
  truck: { name: 'truck' },
  tracking: { name: 'tracking' },
  alert: { name: 'alert' },
  shop: { name: 'shop' },
};

module.exports = {
  validate,
  schemas,
};
