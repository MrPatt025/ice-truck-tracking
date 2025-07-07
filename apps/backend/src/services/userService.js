const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const config = require('../config/env');

class UserService {
  async login(username, password) {
    const user = await userRepository.getByUsername(username);
    if (!user) return null;
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return null;
    return user;
  }

  async register({ username, password, role = 'driver' }) {
    const existing = await userRepository.getByUsername(username);
    if (existing) throw new Error('Username already exists');
    const hashedPassword = await bcrypt.hash(password, config.SALT_ROUNDS);
    return userRepository.create({ username, password: hashedPassword, role });
  }
}

module.exports = new UserService();
