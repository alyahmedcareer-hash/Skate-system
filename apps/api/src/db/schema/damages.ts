import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  text,
  boolean,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'
import { users } from './users'
import { rentals } from './rentals'
import { skates } from './skates'
import { customers } from './customers'
import { inspections } from './inspections'

export const damageReports = mysqlTable('damage_reports', {
  id: int('id').primaryKey().autoincrement(),
  skateId: int('skate_id')
    .notNull()
    .references(() => skates.id),
  rentalId: int('rental_id')
    .notNull()
    .references(() => rentals.id),
  inspectionId: int('inspection_id')
    .notNull()
    .references(() => inspections.id),
  customerId: int('customer_id')
    .notNull()
    .references(() => customers.id),
  reportedBy: int('reported_by')
    .notNull()
    .references(() => users.id),
  damageType: mysqlEnum('damage_type', ['wheel', 'strap', 'brake', 'bearing', 'body', 'other']).notNull(),
  severity: mysqlEnum('severity', ['minor', 'moderate', 'severe']).notNull(),
  description: text('description').notNull(),
  customerCharge: decimal('customer_charge', { precision: 10, scale: 2 }).notNull().default('0.00'),
  chargeCollected: decimal('charge_collected', { precision: 10, scale: 2 }).notNull().default('0.00'),
  chargeWaived: decimal('charge_waived', { precision: 10, scale: 2 }).notNull().default('0.00'),
  waivedBy: int('waived_by').references(() => users.id),
  waiverReason: text('waiver_reason'),
  status: mysqlEnum('status', ['pending', 'partially_paid', 'paid', 'waived']).notNull().default('pending'),
  maintenanceRequired: boolean('maintenance_required').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})
