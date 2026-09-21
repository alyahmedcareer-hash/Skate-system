/**
 * KOSHK SKATE ERP — Settings Schema
 * Phase 05 — Rental POS Core (shared infrastructure)
 *
 * Table: settings
 *   Key-value configuration store.
 *   Created as shared infrastructure in Phase 05 for rental pricing.
 *   Future phases will add their own settings keys without schema changes.
 *
 * Design decisions:
 *   - DEC-061: Settings table created in Phase 05 as shared infrastructure
 *              Only rental configuration keys are seeded in Phase 05
 *              No admin UI in Phase 05
 *   - DEC-068: rental_hourly_rate initial value = "120" (120 EGP/hr)
 *   - DEC-069: rental_duration_options = "[15, 30, 45, 60, 90]"
 *
 * Approved target schema from DATABASE_ARCHITECTURE.md §settings
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  datetime,
  uniqueIndex,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

// ---------------------------------------------------------------------------
// settings table
// ---------------------------------------------------------------------------

export const settings = mysqlTable('settings', {
  id: int('id').primaryKey().autoincrement(),

  // Unique configuration key — used for programmatic lookup
  key: varchar('key', { length: 100 }).notNull().unique(),

  // String-encoded value — parse to required type at runtime
  value: text('value').notNull(),

  // Arabic human-readable label for admin UI (future Settings phase)
  labelAr: varchar('label_ar', { length: 255 }).notNull(),

  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),

  // NULL for system-seeded values — updated_by tracks manual changes
  updatedBy: int('updated_by').references(() => users.id),
})
