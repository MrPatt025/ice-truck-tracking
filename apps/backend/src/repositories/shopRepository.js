const db = require('../config/database');

class ShopRepository {
  async getAll() {
    return db.query('SELECT * FROM shops ORDER BY shop_name');
  }

  async getById(id) {
    const result = await db.query('SELECT * FROM shops WHERE id = ?', [id]);
    return result[0] || null;
  }

  async create(shop) {
    const result = await db.query(
      `INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`,
      [shop.shop_code, shop.shop_name, shop.phone, shop.address, shop.latitude, shop.longitude]
    );
    return this.getById(result.lastID);
  }
}

module.exports = new ShopRepository();
