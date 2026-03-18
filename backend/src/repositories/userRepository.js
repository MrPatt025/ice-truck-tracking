const db = require('../config/database');

class UserRepository {
  async getByUsername(username) {
    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE username = $1 ORDER BY id DESC LIMIT 1',
      [username]
    );
  }

  async getById(id) {
    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
  }

  async create({ username, password, role }) {
    const rows = await db.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3) RETURNING *`,
      [username, password, role],
    );
    return rows[0];
  }

  async updateLastLogin(id) {
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }
}

module.exports = new UserRepository();
