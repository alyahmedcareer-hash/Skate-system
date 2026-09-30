/**
 * KOSHK SKATE ERP — Sequences Schema
 * Phase 14 — Invoices & Printing
 *
 * Table: sequences
 *   Used for generating atomic, centralized sequence numbers across tables.
 *   For example, generating a unified `invoice_number` for both rentals and sales.
 */

import {
  mysqlTable,
  varchar,
  int,
  datetime,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const sequences = mysqlTable('sequences', {
  name: varchar('name', { length: 50 }).primaryKey(),
  value: int('value').notNull().default(0),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
})
