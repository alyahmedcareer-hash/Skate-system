import { db } from './src/db/connection.js'
import { sql } from 'drizzle-orm'

async function run() {
  try {
    const startBound = '2026-08-01'
    const endBound = '2026-10-01'
    const query = sql`
      SELECT 
        u.id, u.name,
        (SELECT SUM(difference) FROM cashier_shifts WHERE cashier_id = u.id AND opened_at >= ${startBound} AND opened_at < ${endBound}) as shiftDifference,
        (SELECT COUNT(id) FROM rentals WHERE cashier_id = u.id AND started_at >= ${startBound} AND started_at < ${endBound}) as rentalsCount,
        (SELECT SUM(amount) FROM treasury_movements WHERE cashier_id = u.id AND reference_type IN ('rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment') AND created_at >= ${startBound} AND created_at < ${endBound}) as revenue,
        (SELECT SUM(amount) FROM treasury_movements WHERE cashier_id = u.id AND reference_type = 'rental_payment' AND created_at >= ${startBound} AND created_at < ${endBound}) as rentalPayments,
        (SELECT SUM(amount) FROM expenses WHERE cashier_id = u.id AND created_at >= ${startBound} AND created_at < ${endBound}) as expenses
      FROM users u
      HAVING rentalsCount > 0 OR revenue > 0 OR expenses > 0 OR shiftDifference IS NOT NULL
    `
    const [data] = await db.execute(query)
    console.log(JSON.stringify(data, null, 2))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
