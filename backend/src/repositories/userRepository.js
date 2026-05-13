const db = require('../config/database');

class UserRepository {
  async getByUsername(username) {
    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE username = $1 ORDER BY id DESC LIMIT 1',
      [username]
    );
  }

  async getByIdentifier(identifier) {
    const normalized = String(identifier || '').trim();
    if (!normalized) return null;

    return db.get(
      `SELECT id, username, email, password, role, last_login
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(COALESCE(email, '')) = LOWER($1)
       ORDER BY id DESC
       LIMIT 1`,
      [normalized]
    );
  }

  async getById(id) {
    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
  }

  async create({ username, email, full_name, password, role }) {
    const rows = await db.query(
      `INSERT INTO users (username, email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, last_login_at as last_login, created_at`,
      [username, email || null, full_name || null, password, role]
    );
    return rows[0] || null;
  }

  async updateLastLogin(id) {
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }
}

module.exports = new UserRepository();
