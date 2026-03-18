const db = require('../config/database');

class ShopRepository {
  async getAll() {
    return db.query(
      'SELECT id, shop_code, shop_name, phone, address, latitude, longitude FROM shops ORDER BY shop_name'
    );
  }

  async getById(id) {
    return db.get(
      'SELECT id, shop_code, shop_name, phone, address, latitude, longitude FROM shops WHERE id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
  }

  async create(shop) {
    const rows = await db.query(
      `INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [shop.shop_code, shop.shop_name, shop.phone, shop.address, shop.latitude, shop.longitude],
    );
    return rows[0];
  }
}

module.exports = new ShopRepository();
