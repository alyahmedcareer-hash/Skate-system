import { db } from '../../db/connection.js'
import { auditLogs } from '../../db/schema/index.js'
import { desc, count, sql } from 'drizzle-orm'

export interface LogActionParams {
  userId: number
  action: string
  entityType: string
  entityId: string
  oldValue?: unknown
  newValue?: unknown
}

export const auditService = {
  /**
   * Log a new audit entry
   * Supports an optional transaction object (tx) for atomic operations.
   */
    async logRaw(params: LogActionParams, connection: any): Promise<void> {
    try {
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.userId,
          params.action,
          params.entityType,
          params.entityId,
          params.oldValue ? JSON.stringify(params.oldValue) : null,
          params.newValue ? JSON.stringify(params.newValue) : null,
        ]
      )
    } catch (error) {
      console.error('Audit Log Error (Raw):', error)
    }
  },

  async log(params: LogActionParams, tx?: any): Promise<void> {
    const dbInstance = tx || db
    try {
      await dbInstance.insert(auditLogs).values({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : null,
        newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : null,
      })
    } catch (error) {
      // Do not crash the business operation if audit fails
      console.error('Audit Log Error:', error)
    }
  },

  /**
   * List audit logs with pagination
   */
  async listLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit

    const [logs, totalResult] = await Promise.all([
      db.query.auditLogs.findMany({
        orderBy: [desc(auditLogs.createdAt)],
        limit,
        offset,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }),
      db.select({ count: count() }).from(auditLogs)
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}
