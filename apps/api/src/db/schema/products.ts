import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  boolean,
} from 'drizzle-orm/mysql-core'

export const productCategories = mysqlTable('product_categories', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  nameAr: varchar('name_ar', { length: 100 }).notNull(),
})

export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  categoryId: int('category_id')
    .notNull()
    .references(() => productCategories.id),
  barcode: varchar('barcode', { length: 255 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stockQuantity: int('stock_quantity').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})
