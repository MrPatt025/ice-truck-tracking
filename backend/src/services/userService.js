const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const config = require('../config/env');

/**
 * Normalize a string field by trimming and validating
 * @param {unknown} value - Value to normalize
 * @returns {string|null} Normalized string or null if invalid
 */
function normalizeString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extract username from explicit username or email
 * @param {unknown} username - Explicit username
 * @param {unknown} email - Email fallback
 * @returns {string} Normalized username
 */
function extractUsername(username, email) {
  const normalized = normalizeString(username);
  if (normalized) return normalized;

  const emailStr = normalizeString(email);
  return emailStr?.includes('@') ? emailStr.split('@')[0] : '';
}

/**
 * Resolve full name from full_name or name field
 * @param {unknown} full_name - Primary full name field
 * @param {unknown} name - Fallback name field
 * @returns {string|null} Resolved full name or null
 */
function resolveFullName(full_name, name) {
  const primaryName = normalizeString(full_name);
  if (primaryName) return primaryName;

  const fallbackName = normalizeString(name);
  return fallbackName;
}

/**
 * Validate password string
 * @param {unknown} password - Password to validate
 * @throws {Error} If password is invalid
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
}

class UserService {
  async login(identifier, password) {
    const user = await userRepository.getByIdentifier(identifier);
    if (!user) return null;
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return null;
    await userRepository.updateLastLogin(user.id);
    return user;
  }

  async register({ username, email, name, full_name, phone, company, password, role = 'driver' }) {
    // Extract and normalize username
    const normalizedUsername = extractUsername(username, email);
    if (!normalizedUsername) {
      throw new Error('Username is required');
    }

    // Validate password
    validatePassword(password);

    // Normalize other fields
    const normalizedEmail = normalizeString(email);
    const resolvedFullName = resolveFullName(full_name, name);
    const normalizedPhone = normalizeString(phone);
    const normalizedCompany = normalizeString(company);

    // Check for duplicate username
    const existing = await userRepository.getByUsername(normalizedUsername);
    if (existing) throw new Error('Username already exists');

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS);
    return userRepository.create({
      username: normalizedUsername,
      email: normalizedEmail,
      full_name: resolvedFullName,
      phone: normalizedPhone,
      company: normalizedCompany,
      password: hashedPassword,
      role,
    });
  }
}

module.exports = new UserService();
