/**
 * KOSHK SKATE ERP — Rentals Schema
 * Phase 05 — Rental POS Core
 *
 * Table: rentals
 *   Each row represents one skate rental transaction.
 *   Rentals are the core business domain — created by the Rental POS.
 *
 * Design decisions:
 *   - DEC-060: No payment recording in Phase 05 — Phase 06 owns payment tables
 *   - DEC-062: rental_code format: RN-NNNNN, sequential, UNIQUE, never reused
 *   - DEC-063: shift_id is nullable — cashier_shifts table does not exist in Phase 05
 *              FK to cashier_shifts(id) deferred to Phase 12 migration
 *   - DEC-064: Persisted statuses: 'active', 'returned', 'cancelled' ONLY
 *              'normal', 'ending_soon', 'overdue' are computed display states — NEVER stored
 *   - DEC-065: Pricing formula: raw = hourly_rate × duration_minutes / 60
 *              rental_amount = Math.round(raw) — nearest whole EGP
 *   - DEC-067: Rounding rule: nearest whole EGP, .5 rounds up
 *   - DEC-068: Initial hourly rate = 120 EGP/hr (from settings table)
 *
 * Historical immutability (DEC-003, DEC-065):
 *   price_per_hour and rental_amount are snapshots at creation — never updated.
 *
 * TD-RENT-01: shift_id nullable — FK to cashier_shifts deferred to Phase 12.
 * TD-RENT-02: No payment recording — gap acknowledged, deferred to Phase 06.
 */

import {
  mysqlTable,
  int,
  varchar,
  decimal,
  text,
  datetime,
  mysqlEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { skates } from './skates.js'
import { customers } from './customers.js'
import { users } from './users.js'

// ---------------------------------------------------------------------------
// Rental status values (persisted lifecycle) — DEC-064
// ---------------------------------------------------------------------------

export const RENTAL_STATUSES = [
  'active',
  'returned',
  'cancelled',
] as const

export type RentalStatus = typeof RENTAL_STATUSES[number]

// ---------------------------------------------------------------------------
// Computed operational display states — DEC-064, DEC-066
// These are NEVER persisted. Server computes them from timestamps.
// ---------------------------------------------------------------------------

export const RENTAL_OPERATIONAL_STATUSES = [
  'normal',      // remaining_time > 5 minutes
  'ending_soon', // remaining_time <= 5 minutes AND > 0 (including exact 0 ms diff)
  'overdue',     // NOW() strictly greater than expected_end_at (DEC-066)
] as const

export type RentalOperationalStatus = typeof RENTAL_OPERATIONAL_STATUSES[number]

// Ending Soon threshold in minutes — DEC-066
export const ENDING_SOON_THRESHOLD_MINUTES = 5

// ---------------------------------------------------------------------------
// rentals table
// ---------------------------------------------------------------------------

export const rentals = mysqlTable('rentals', {
  id: int('id').primaryKey().autoincrement(),

  // DEC-062 / DEC-070: Format RN-NNNNN, derived from insertId (PK), UNIQUE, never reused
  // Gaps from rolled-back transactions are allowed. See DEC-070 for algorithm details.
  rentalCode: varchar('rental_code', { length: 50 }).notNull().unique(),

  // FK to skates — the physical skate being rented
  skateId: int('skate_id').notNull().references(() => skates.id),

  // FK to customers — DEC-052: customer must be active at rental creation
  customerId: int('customer_id').notNull().references(() => customers.id),

  // FK to users — the cashier who created the rental
  cashierId: int('cashier_id').notNull().references(() => users.id),

  // DEC-063: nullable — cashier_shifts table does not exist in Phase 05
  // FK to cashier_shifts(id) will be added in Phase 12 migration
  // TD-RENT-01: Phase 12 will add the FK constraint
  shiftId: int('shift_id'),

  // Planned rental duration in minutes — DEC-069: must be > 0, no maximum
  durationMinutes: int('duration_minutes').notNull(),

  // DEC-065: Historical snapshot of the configured hourly rate at rental creation
  // Immutable after creation — DECIMAL(10,2) to match settings precision
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }).notNull(),

  // DEC-065, DEC-067: Server-calculated, rounded to whole EGP
  // Immutable after creation — stored as e.g. "83.00" (DECIMAL stores whole EGP as .00)
  rentalAmount: decimal('rental_amount', { precision: 10, scale: 2 }).notNull(),

  // DEC-019: Server-generated at activation — NOT user-supplied
  startedAt: datetime('started_at').notNull(),

  // Stored: startedAt + durationMinutes — DEC-010
  expectedEndAt: datetime('expected_end_at').notNull(),

  // Phase 07 sets this — null while active
  returnedAt: datetime('returned_at'),

  // DEC-064: Persisted lifecycle status — ONLY these three values
  status: mysqlEnum('status', RENTAL_STATUSES).notNull().default('active'),

  notes: text('notes'),

  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  // DEC-062 / DEC-070: UNIQUE on rental_code — insertId-based, concurrency-safe
  rentalCodeIdx: uniqueIndex('rentals_rental_code_unique').on(table.rentalCode),

  // Performance indexes
  skateIdIdx:       index('rentals_skate_id_idx').on(table.skateId),
  customerIdIdx:    index('rentals_customer_id_idx').on(table.customerId),
  cashierIdIdx:     index('rentals_cashier_id_idx').on(table.cashierId),
  statusIdx:        index('rentals_status_idx').on(table.status),
  expectedEndAtIdx: index('rentals_expected_end_at_idx').on(table.expectedEndAt),
  startedAtIdx:     index('rentals_started_at_idx').on(table.startedAt),
}))
