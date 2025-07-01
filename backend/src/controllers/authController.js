const bcrypt = require('bcrypt');
const { createSendToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../config/logger');
const config = require('../config/env');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 1) Check if username and password exist
    if (!username || !password) {
      return next(new AppError('Please provide username and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return next(new AppError('Incorrect username or password', 401));
    }

    const user = users[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      logger.warn(`Failed login attempt for username: ${username} - incorrect password`);
      return next(new AppError('Incorrect username or password', 401));
    }

    // 3) If everything ok, send token to client
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

    // Check if user already exists
    const existingUsers = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      return next(new AppError('Username already exists', 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );

    const newUser = {
      id: result.lastID,
      username,
      role
    };

    logger.info(`New user registered: ${username}`);
    createSendToken(newUser, 201, res);
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

module.exports = {
  login,
  register
};