const { AppError } = require('./error');

/**
 * Extract identifier from username or email
 * @param {unknown} username - Username field
 * @param {unknown} email - Email field
 * @returns {string|null} Extracted identifier or null
 */
function extractIdentifier(username, email) {
  if (typeof username === 'string' && username.trim().length > 0) {
    return username.trim();
  }

  if (typeof email === 'string' && email.trim().length > 0) {
    return email.trim();
  }

  return null;
}

/**
 * Check if username is valid
 * @param {unknown} username - Username to validate
 * @returns {boolean} True if valid
 */
function isValidUsername(username) {
  return typeof username === 'string' && username.trim().length >= 3;
}

/**
 * Check if email is valid
 * @param {unknown} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  return (
    typeof email === 'string' &&
    email.trim().length >= 5 &&
    email.includes('@')
  );
}

/**
 * Check if password meets requirements
 * @param {unknown} password - Password to validate
 * @returns {boolean} True if valid
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Validate login request
 * @param {Object} body - Request body
 * @throws {AppError} If validation fails
 */
function validateLogin(body) {
  const identifier = extractIdentifier(body.username, body.email);

  if (!identifier || !body.password) {
    throw new AppError('Username/email and password are required', 400);
  }

  if (identifier.length < 3) {
    throw new AppError(
      'Username/email must be at least 3 characters',
      400
    );
  }

  if (!isValidPassword(body.password)) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
}

/**
 * Validate register request
 * @param {Object} body - Request body
 * @throws {AppError} If validation fails
 */
function validateRegister(body) {
  const hasValidUsername = isValidUsername(body.username);
  const hasValidEmail = isValidEmail(body.email);

  if (!hasValidUsername && !hasValidEmail) {
    throw new AppError('Username or valid email is required', 400);
  }

  if (!isValidPassword(body.password)) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  // If email is provided, ensure it's valid
  if (body.email !== undefined && !hasValidEmail) {
    throw new AppError('Email must be a valid email address', 400);
  }
}

// Simple validation without Joi
const validate = schema => {
  return (req, res, next) => {
    try {
      const { body } = req;

      if (schema.name === 'login') {
        validateLogin(body);
      }

      if (schema.name === 'register') {
        validateRegister(body);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError('Validation failed', 400));
    }
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
