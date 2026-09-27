const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '1234', database: 'koshk_skate_test' });
  const [shifts] = await conn.execute('SELECT * FROM cashier_shifts');
  console.log('SHIFTS:', shifts);
  const [movements] = await conn.execute('SELECT * FROM treasury_movements');
  console.log('MOVEMENTS:', movements);
  const [expenses] = await conn.execute('SELECT * FROM expenses');
  console.log('EXPENSES:', expenses);
  conn.end();
}

test().catch(console.error);
