/**
 * KOSHK SKATE ERP — Customers Schema
 * Phase 04 — Customers Module
 *
 * Table: customers
 *   Each row is one real-world customer of the skate rental business.
 *   Customers are referenced by rentals, damage reports, reservations, and sales.
 *
 * Design decisions:
 *   - DEC-051: name + phone are required; national_id and notes are optional
 *   - DEC-052: Soft-deactivation via is_active; hard-delete permanently prohibited
 *              Deactivated customers excluded from Rental POS search (isActive filter)
 *              Customers are reactivatable
 *   - DEC-053: national_id is UNIQUE (nullable) — two customers may not share the same National ID
 *              NULL is allowed (customer may not have it on hand); two NULLs do not conflict
 *   - DEC-054: phone is NOT UNIQUE — families share phone numbers; phone is a contact field only
 *   - DEC-056: national_id is PII — list API returns masked value only; profile API returns full value
 *
 * Schema delta from DATABASE_ARCHITECTURE.md:
 *   - is_active column ADDED per DEC-052 (not in original planned schema)
 *   - Approved by owner 2026-09-15
 */

import {
  mysqlTable,
  int,
  varchar,
  boolean,
  date,
  text,
  datetime,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// customers table
// ---------------------------------------------------------------------------

export const customers = mysqlTable('customers', {
  id: int('id').primaryKey().autoincrement(),

  // DEC-051: required
  name:  varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),

  // DEC-051: optional; DEC-053: UNIQUE when provided (nullable UNIQUE — MySQL allows multiple NULLs)
  nationalId: varchar('national_id', { length: 50 }),

  // System-generated at creation = today's date; cashier does not input this
  registrationDate: date('registration_date').notNull(),

  // DEC-051: optional free-text
  notes: text('notes'),

  // DEC-052: soft-deactivation — no hard delete
  isActive: boolean('is_active').notNull().default(true),

  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  // DEC-053: UNIQUE on national_id (MySQL allows multiple NULLs in a UNIQUE index)
  nationalIdIdx: uniqueIndex('customers_national_id_unique').on(table.nationalId),

  // DEC-054: phone is searchable but NOT unique
  phoneIdx: index('customers_phone_idx').on(table.phone),

  // name is searchable
  nameIdx: index('customers_name_idx').on(table.name),
}))
