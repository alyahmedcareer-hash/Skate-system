import mysql from 'mysql2/promise'
import { execSync } from 'child_process'
import path from 'path'
import url from 'url'
import 'dotenv/config'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

async function run() {
  const dbName = process.env.VERIFY_DB_NAME || 'koshk_skate_migration_verify'
  console.log(`1. Creating fresh DB ${dbName}...`)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  })
  
  await conn.query(`DROP DATABASE IF EXISTS ${dbName}`)
  await conn.query(`CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.end()
  console.log('DB created.')
  
  console.log('2. Running drizzle-kit migrate...')
  try {
    execSync(`npx cross-env DB_NAME=${dbName} npx drizzle-kit migrate`, { 
      cwd: rootDir,
      stdio: 'inherit'
    })
  } catch (err) {
    console.error('Migration failed!')
    process.exit(1)
  }
  
  console.log('3. Running seed script...')
  try {
    execSync(`npx cross-env DB_NAME=${dbName} tsx src/db/seed.ts`, { 
      cwd: rootDir,
      stdio: 'inherit'
    })
  } catch (err) {
    console.error('Seeding failed!')
    process.exit(1)
  }
  
  console.log('Verification completed successfully.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
