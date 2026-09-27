import { db } from './src/db/connection.js'
import { sql } from 'drizzle-orm'

async function run() {
  try {
    const [skatesData] = await db.execute(sql`SELECT * FROM skates`)
    console.log("All Skates:", JSON.stringify(skatesData, null, 2))
    
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
