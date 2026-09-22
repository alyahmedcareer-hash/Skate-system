import { int, mysqlTable, mysqlEnum, varchar, text, decimal, datetime } from 'drizzle-orm/mysql-core'
import { skates } from './skates'
import { users } from './users'
import { damageReports } from './damages'
import { inspections } from './inspections'

export const maintenanceRecords = mysqlTable('maintenance_records', {
  id: int('id').primaryKey().autoincrement(),
  skateId: int('skate_id')
    .notNull()
    .references(() => skates.id),
  inspectionId: int('inspection_id')
    .references(() => inspections.id),
  damageReportId: int('damage_report_id')
    .references(() => damageReports.id),
  createdBy: int('created_by')
    .notNull()
    .references(() => users.id),
  completedBy: int('completed_by')
    .references(() => users.id),
  
  problemDescription: text('problem_description'),
  repairDescription: text('repair_description'),
  
  laborCost: decimal('labor_cost', { precision: 10, scale: 2 }).default('0'),
  partsCost: decimal('parts_cost', { precision: 10, scale: 2 }).default('0'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0'),
  
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed']).notNull().default('pending'),
  
  startedAt: datetime('started_at'),
  completedAt: datetime('completed_at'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
})

export const maintenanceParts = mysqlTable('maintenance_parts', {
  id: int('id').primaryKey().autoincrement(),
  maintenanceId: int('maintenance_id')
    .notNull()
    .references(() => maintenanceRecords.id),
  partName: varchar('part_name', { length: 255 }).notNull(),
  quantity: int('quantity').notNull().default(1),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
})
