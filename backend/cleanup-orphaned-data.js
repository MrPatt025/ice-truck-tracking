const db = require('./src/config/database');

try {
  console.log('Checking orphaned route_details...');
  const orphanedData = await db.query(`
    SELECT rd.*
    FROM route_details rd
    LEFT JOIN routes r ON rd.route_id = r.id
    WHERE r.id IS NULL
  `);
  console.log('Found orphaned route_details:', orphanedData.length);
  if (orphanedData.length > 0) {
    console.log('Deleting orphaned route_details...');
    const result = await db.query(`
      DELETE FROM route_details
      USING (
        SELECT rd.id
        FROM route_details rd
        LEFT JOIN routes r ON rd.route_id = r.id
        WHERE r.id IS NULL
      ) orphaned
      WHERE route_details.id = orphaned.id
    `);
    console.log('Deleted:', result.length, 'rows');
  } else {
    console.log('No orphaned route_details found');
  }
  const [rdCount] = await db.query('SELECT COUNT(*) as count FROM route_details');
  const [rCount] = await db.query('SELECT COUNT(*) as count FROM routes');
  console.log('Remaining route_details:', rdCount?.count ?? 0);
  console.log('Remaining routes:', rCount?.count ?? 0);
} catch (error) {
  console.error('Error:', error);
} finally {
  await db.close();
  process.exit(0);
}
