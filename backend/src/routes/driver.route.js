const r = require('express').Router(), db = require('../config/db'), auth = require('../middleware/auth');
r.get('/', auth(['admin','owner']), async (req, res) => { const [rows] = await db.query('SELECT * FROM drivers'); res.json(rows); });
r.post('/', auth(['admin']), async (req, res) => {
  const d = req.body;
  await db.query('INSERT INTO drivers (driver_code, full_name, national_id, license_number, username, address, phone, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [d.driver_code, d.full_name, d.national_id, d.license_number, d.username, d.address, d.phone, d.start_date]);
  res.json({ message: 'Driver added' });
});
r.put('/:id', auth(['admin']), async (req, res) => {
  const d = req.body;
  await db.query('UPDATE drivers SET full_name=?, phone=?, address=? WHERE id=?', [d.full_name, d.phone, d.address, req.params.id]);
  res.json({ message: 'Updated' });
});
r.delete('/:id', auth(['admin']), async (req, res) => {
  await db.query('DELETE FROM drivers WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});
module.exports = r;