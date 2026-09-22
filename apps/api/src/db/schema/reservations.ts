/**
 * KOSHK SKATE ERP — Reservations Schema
 * Phase 10 — Reservations
 *
 * Table: reservations
 *   Tracks pre-bookings of specific skates by customers.
 */

import {
  mysqlTable,
  int,
  varchar,
  datetime,
  mysqlEnum,
  text,
  index,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { skates } from './skates'
import { customers } from './customers'
import { users } from './users'

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'fulfilled',
] as const

export type ReservationStatus = typeof RESERVATION_STATUSES[number]

export const reservations = mysqlTable('reservations', {
  id: int('id').primaryKey().autoincrement(),
  
  // FK to customers — prevents hard deletion if they have reservations
  customerId: int('customer_id').notNull().references(() => customers.id),
  
  // FK to skates — required for Phase 10
  skateId: int('skate_id').notNull().references(() => skates.id),
  
  // Size booking left in schema for future compatibility, but not used in Phase 10
  skateSize: varchar('skate_size', { length: 20 }),
  
  reservedFrom: datetime('reserved_from').notNull(),
  reservedUntil: datetime('reserved_until').notNull(),
  
  status: mysqlEnum('status', RESERVATION_STATUSES).notNull().default('pending'),
  
  createdBy: int('created_by').notNull().references(() => users.id),
  
  notes: text('notes'),
  
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  customerIdIdx: index('reservations_customer_id_idx').on(table.customerId),
  skateIdIdx: index('reservations_skate_id_idx').on(table.skateId),
  statusIdx: index('reservations_status_idx').on(table.status),
  reservedFromIdx: index('reservations_reserved_from_idx').on(table.reservedFrom),
}))
