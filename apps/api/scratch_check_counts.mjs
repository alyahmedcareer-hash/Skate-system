import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'koshk_skate',
  });

  const tables = [
    'customers',
    'skates',
    'users',
    'roles',
    'rentals',
    'rental_payments',
    'treasury_movements',
    'damage_reports',
    'maintenance_records'
  ];

  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`SELECT count(*) as count FROM ${table}`);
      console.log(`[koshk_skate] ${table}: ${rows[0].count}`);
    } catch (err) {
      console.error(`Error querying ${table}: ${err.message}`);
    }
  }

  // Create test database
  try {
    await connection.execute('CREATE DATABASE IF NOT EXISTS koshk_skate_test');
    console.log('Test database created or already exists.');
  } catch (err) {
    console.error('Failed to create test database:', err.message);
  }

  await connection.end();
}

main().catch(console.error);
