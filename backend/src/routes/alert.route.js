const r = require('express').Router(), db = require('../config/db'), auth = require('../middleware/auth');
r.get('/', auth(), async (req, res) => { 
  const [rows] = await db.query('SELECT * FROM alerts ORDER BY alert_time DESC'); 
  res.json(rows); 
});
r.post('/', auth(), async (req, res) => {
  const { truck_id, driver_id, message } = req.body;
  await db.query('INSERT INTO alerts (truck_id, driver_id, message, alert_time) VALUES (?, ?, ?, ?)',
    [truck_id, driver_id, message, new Date()]);
  res.json({ success: true, message: 'Alert created successfully' });
});
module.exports = r;