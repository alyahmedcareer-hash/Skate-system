import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'
import { users } from './users'
import { customers } from './customers'
import { products } from './products'
import { paymentMethods, treasuryAccounts } from './payments'

export const sales = mysqlTable('sales', {
  id: int('id').primaryKey().autoincrement(),
  saleCode: varchar('sale_code', { length: 50 }).notNull().unique(),
  customerId: int('customer_id').references(() => customers.id),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  shiftId: int('shift_id'), // Nullable until Phase 12
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['completed', 'cancelled']).notNull().default('completed'),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const saleItems = mysqlTable('sale_items', {
  id: int('id').primaryKey().autoincrement(),
  saleId: int('sale_id').notNull().references(() => sales.id),
  productId: int('product_id').notNull().references(() => products.id),
  quantity: int('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
})

export const salePayments = mysqlTable('sale_payments', {
  id: int('id').primaryKey().autoincrement(),
  saleId: int('sale_id').notNull().references(() => sales.id),
  paymentMethodId: int('payment_method_id').notNull().references(() => paymentMethods.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  treasuryAccountId: int('treasury_account_id').notNull().references(() => treasuryAccounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
