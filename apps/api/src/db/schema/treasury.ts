import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'
import { users } from './users'

export const cashierShifts = mysqlTable('cashier_shifts', {
  id: int('id').primaryKey().autoincrement(),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  openingBalance: decimal('opening_balance', { precision: 10, scale: 2 }).notNull(),
  expectedBalance: decimal('expected_balance', { precision: 10, scale: 2 }), // updated at closing
  actualBalance: decimal('actual_balance', { precision: 10, scale: 2 }),
  difference: decimal('difference', { precision: 10, scale: 2 }),
  status: mysqlEnum('status', ['active', 'closed']).notNull().default('active'),
  notes: varchar('notes', { length: 1000 }),
})

export const expenses = mysqlTable('expenses', {
  id: int('id').primaryKey().autoincrement(),
  categoryId: int('category_id'), // optional category lookup if needed later
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  shiftId: int('shift_id').notNull().references(() => cashierShifts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
