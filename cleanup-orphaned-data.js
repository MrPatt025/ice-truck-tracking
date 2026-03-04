const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/ice_tracking',
});

try {
  console.log('Checking orphaned route_details...');
  const { rows: orphanedData } = await pool.query(`
    SELECT rd.*
    FROM route_details rd
    LEFT JOIN routes r ON rd.route_id = r.id
    WHERE r.id IS NULL
  `);
  console.log('Found orphaned route_details:', orphanedData.length);
  if (orphanedData.length > 0) {
    console.log('Deleting orphaned route_details...');
    const result = await pool.query(`
      DELETE FROM route_details
      USING (
        SELECT rd.id
        FROM route_details rd
        LEFT JOIN routes r ON rd.route_id = r.id
        WHERE r.id IS NULL
      ) orphaned
      WHERE route_details.id = orphaned.id
    `);
    console.log('Deleted:', result.rowCount, 'rows');
  } else {
    console.log('No orphaned route_details found');
  }
  const { rows: [rdCount] } = await pool.query('SELECT COUNT(*) as count FROM route_details');
  const { rows: [rCount] } = await pool.query('SELECT COUNT(*) as count FROM routes');
  console.log('Remaining route_details:', rdCount.count);
  console.log('Remaining routes:', rCount.count);
} catch (error) {
  console.error('Error:', error);
} finally {
  await pool.end();
}
