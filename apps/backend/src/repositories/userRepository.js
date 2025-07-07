const db = require('../config/database');

class UserRepository {
    async getByUsername(username) {
        const result = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        return result[0] || null;
    }

    async getById(id) {
        const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return result[0] || null;
    }

    async create({ username, password, role }) {
        const result = await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, password, role]
        );
        return this.getById(result.lastID);
    }
}

module.exports = new UserRepository(); 
