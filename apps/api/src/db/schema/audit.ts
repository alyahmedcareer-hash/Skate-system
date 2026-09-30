import { mysqlTable, serial, int, varchar, timestamp, json } from 'drizzle-orm/mysql-core'
import { users } from './users'

export const auditLogs = mysqlTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: int('user_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'RENTAL_STARTED', 'WAIVER_APPLIED'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // e.g., 'rental', 'inspection', 'damage', 'setting'
  entityId: varchar('entity_id', { length: 50 }).notNull(),
  oldValue: json('old_value'),
  newValue: json('new_value'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

import { relations } from 'drizzle-orm'

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))
