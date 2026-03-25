const db = require('../config/database');

const useFakeDb = process.env.USE_FAKE_DB === 'true';
const fakeUsers = [];

class UserRepository {
  _getLatestFakeUserBy(predicate) {
    for (let i = fakeUsers.length - 1; i >= 0; i -= 1) {
      if (predicate(fakeUsers[i])) return fakeUsers[i];
    }
    return null;
  }

  async getByUsername(username) {
    if (useFakeDb) {
      return this._getLatestFakeUserBy(
        user => typeof user.username === 'string' && user.username.toLowerCase() === String(username).toLowerCase()
      );
    }

    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE username = $1 ORDER BY id DESC LIMIT 1',
      [username]
    );
  }

  async getByIdentifier(identifier) {
    const normalized = String(identifier || '').trim();
    if (!normalized) return null;

    if (useFakeDb) {
      const needle = normalized.toLowerCase();
      return this._getLatestFakeUserBy(user =>
        (typeof user.username === 'string' && user.username.toLowerCase() === needle)
        || (typeof user.email === 'string' && user.email.toLowerCase() === needle)
      );
    }

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
    if (useFakeDb) {
      return this._getLatestFakeUserBy(user => user.id === id || String(user.id) === String(id));
    }

    return db.get(
      'SELECT id, username, password, role, last_login FROM users WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
  }

  async create({ username, email, full_name, phone, company, password, role }) {
    if (useFakeDb) {
      const user = {
        id: fakeUsers.length + 1,
        username,
        email: email || null,
        full_name: full_name || null,
        phone: phone || null,
        company: company || null,
        password,
        role,
        last_login: null,
        created_at: new Date().toISOString(),
      };
      fakeUsers.push(user);
      return user;
    }

    const rows = await db.query(
      `INSERT INTO users (username, email, full_name, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, last_login, created_at`,
      [username, email || null, full_name || null, password, role],
    );
    return rows[0] || null;
  }

  async updateLastLogin(id) {
    if (useFakeDb) {
      const user = await this.getById(id);
      if (user) user.last_login = new Date().toISOString();
      return;
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }
}

module.exports = new UserRepository();
