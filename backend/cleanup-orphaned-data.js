const db = require('./src/config/database');

try {
  const orphanedData = await db.query(`
    SELECT rd.*
    FROM route_details rd
    LEFT JOIN routes r ON rd.route_id = r.id
    WHERE r.id IS NULL
  `);
  if (orphanedData.length > 0) {
      await db.query(`
      DELETE FROM route_details
      USING (
        SELECT rd.id
        FROM route_details rd
        LEFT JOIN routes r ON rd.route_id = r.id
        WHERE r.id IS NULL
      ) orphaned
      WHERE route_details.id = orphaned.id
    `);
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  await db.close();
  process.exit(0);
}
