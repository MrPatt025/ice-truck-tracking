const r = require('express').Router(), db = require('../config/db'), auth = require('../middleware/auth');
r.get('/', auth(), async (req, res) => { const [rows] = await db.query('SELECT * FROM trucks'); res.json(rows); });
r.post('/', auth(['admin']), async (req, res) => {
  const t = req.body;
  await db.query('INSERT INTO trucks (truck_code, plate_number, model, color, gps_code) VALUES (?, ?, ?, ?, ?)',
    [t.truck_code, t.plate_number, t.model, t.color, t.gps_code]);
  res.json({ message: 'Truck added' });
});
r.put('/:id', auth(['admin']), async (req, res) => {
  const t = req.body;
  await db.query('UPDATE trucks SET model=?, color=? WHERE id=?', [t.model, t.color, req.params.id]);
  res.json({ message: 'Updated' });
});
r.delete('/:id', auth(['admin']), async (req, res) => {
  await db.query('DELETE FROM trucks WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});
module.exports = r;