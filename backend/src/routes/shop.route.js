const r = require('express').Router(), db = require('../config/db'), auth = require('../middleware/auth');
r.get('/', auth(), async (req, res) => { 
  const [rows] = await db.query('SELECT * FROM shops'); 
  res.json(rows); 
});
r.post('/', auth(['admin']), async (req, res) => {
  const s = req.body;
  await db.query('INSERT INTO shops (shop_code, shop_name, phone, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
    [s.shop_code, s.shop_name, s.phone, s.address, s.latitude, s.longitude]);
  res.json({ message: 'Shop added' });
});
module.exports = r;