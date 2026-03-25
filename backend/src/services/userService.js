const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const config = require('../config/env');

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
    const normalizedUsername = typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '');

    if (!normalizedUsername) {
      throw new Error('Username is required');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    const normalizedEmail = typeof email === 'string' && email.trim().length > 0 ? email.trim() : null;
    const resolvedFullName =
      typeof full_name === 'string' && full_name.trim().length > 0
        ? full_name.trim()
        : (typeof name === 'string' && name.trim().length > 0 ? name.trim() : null);

    const existing = await userRepository.getByUsername(normalizedUsername);
    if (existing) throw new Error('Username already exists');
    const hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS);
    return userRepository.create({
      username: normalizedUsername,
      email: normalizedEmail,
      full_name: resolvedFullName,
      phone: typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null,
      company: typeof company === 'string' && company.trim().length > 0 ? company.trim() : null,
      password: hashedPassword,
      role,
    });
  }
}

module.exports = new UserService();
