import { db } from '../../db/connection.js'
import { sequences } from '../../db/schema/sequences.js'
import { sql } from 'drizzle-orm'

/**
 * Atomically generates the next sequence number for a given sequence name.
 * We use a transaction and `ON DUPLICATE KEY UPDATE` equivalent logic to ensure
 * concurrency-safe generation.
 */
export async function getNextSequenceNumber(sequenceName: string): Promise<number> {
  // We can do an INSERT ... ON DUPLICATE KEY UPDATE value = value + 1
  // and then SELECT the value within a transaction.
  return await db.transaction(async (tx) => {
    // Insert if not exists, otherwise increment
    await tx.execute(
      sql`INSERT INTO sequences (name, value) VALUES (${sequenceName}, 1)
          ON DUPLICATE KEY UPDATE value = value + 1`
    )

    // Retrieve the newly updated value
    const [rows] = await tx.execute(
      sql`SELECT value FROM sequences WHERE name = ${sequenceName}`
    ) as any

    if (!rows || rows.length === 0) {
      throw new Error(`Failed to generate sequence for ${sequenceName}`)
    }

    return rows[0].value
  })
}

/**
 * Generates the unified invoice number.
 * Example format: INV-000001
 */
export async function generateInvoiceNumber(): Promise<string> {
  const nextVal = await getNextSequenceNumber('invoice_number')
  return `INV-${nextVal.toString().padStart(6, '0')}`
}
