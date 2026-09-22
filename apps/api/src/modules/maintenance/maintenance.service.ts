import { eq, desc, sql, and } from 'drizzle-orm'
import { db } from '../../db/connection'
import { maintenanceRecords, maintenanceParts, skates, users } from '../../db/schema/index.js'
import { NotFoundError, BusinessRuleError } from '../../utils/errors.js'
import type { 
  CreateMaintenanceRecordPayload, 
  UpdateMaintenanceRecordPayload,
  CompleteMaintenanceRecordPayload,
  AddMaintenancePartPayload
} from './maintenance.types'

export class MaintenanceService {
  /**
   * List maintenance records with optional pagination
   */
  async listRecords(query: Record<string, string | number | undefined> = {}) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 50
    const offset = (page - 1) * limit

    const conditions = []
    if (query.status) {
      conditions.push(eq(maintenanceRecords.status, query.status as any))
    }
    if (query.skateId) {
      conditions.push(eq(maintenanceRecords.skateId, Number(query.skateId)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .where(whereClause)

    const records = await db
      .select({
        id: maintenanceRecords.id,
        skateId: maintenanceRecords.skateId,
        skateCode: skates.skateCode,
        problemDescription: maintenanceRecords.problemDescription,
        repairDescription: maintenanceRecords.repairDescription,
        status: maintenanceRecords.status,
        totalCost: maintenanceRecords.totalCost,
        createdAt: maintenanceRecords.createdAt,
        startedAt: maintenanceRecords.startedAt,
        completedAt: maintenanceRecords.completedAt,
        createdByName: users.name,
      })
      .from(maintenanceRecords)
      .leftJoin(skates, eq(maintenanceRecords.skateId, skates.id))
      .leftJoin(users, eq(maintenanceRecords.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRecords.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      records,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
      }
    }
  }

  /**
   * Get a specific maintenance record including its parts
   */
  async getRecord(id: number) {
    const [record] = await db
      .select({
        id: maintenanceRecords.id,
        skateId: maintenanceRecords.skateId,
        skateCode: skates.skateCode,
        inspectionId: maintenanceRecords.inspectionId,
        damageReportId: maintenanceRecords.damageReportId,
        problemDescription: maintenanceRecords.problemDescription,
        repairDescription: maintenanceRecords.repairDescription,
        status: maintenanceRecords.status,
        laborCost: maintenanceRecords.laborCost,
        partsCost: maintenanceRecords.partsCost,
        totalCost: maintenanceRecords.totalCost,
        createdAt: maintenanceRecords.createdAt,
        startedAt: maintenanceRecords.startedAt,
        completedAt: maintenanceRecords.completedAt,
        createdByName: users.name,
      })
      .from(maintenanceRecords)
      .leftJoin(skates, eq(maintenanceRecords.skateId, skates.id))
      .leftJoin(users, eq(maintenanceRecords.createdBy, users.id))
      .where(eq(maintenanceRecords.id, id))
      .limit(1)

    if (!record) {
      throw new NotFoundError('سجل الصيانة غير موجود')
    }

    const parts = await db
      .select()
      .from(maintenanceParts)
      .where(eq(maintenanceParts.maintenanceId, id))

    return { ...record, parts }
  }

  /**
   * Create a new pending maintenance record
   */
  async createRecord(payload: CreateMaintenanceRecordPayload, userId: number) {
    return await db.transaction(async (tx) => {
      // Ensure the skate exists
      const [skate] = await tx
        .select()
        .from(skates)
        .where(eq(skates.id, payload.skateId))
        .for('update')

      if (!skate) {
        throw new NotFoundError('الزلاجة غير موجودة')
      }

      // If manual creation, we might need to enforce the skate is in maintenance status.
      // But we will allow creating it, and ensure the skate is set to 'maintenance'.
      if (skate.status !== 'maintenance') {
        await tx.update(skates)
          .set({ status: 'maintenance', updatedAt: new Date() })
          .where(eq(skates.id, payload.skateId))
      }

      const [result] = await tx.insert(maintenanceRecords).values({
        skateId: payload.skateId,
        inspectionId: payload.inspectionId,
        damageReportId: payload.damageReportId,
        problemDescription: payload.problemDescription,
        createdBy: userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return result.insertId
    })
  }

  /**
   * Add a spare part to an open maintenance record
   */
  async addPart(id: number, payload: AddMaintenancePartPayload) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل سجل صيانة مغلق', 'ALREADY_COMPLETED')
      }

      const totalPartCost = Number(payload.quantity) * Number(payload.unitCost)

      await tx.insert(maintenanceParts).values({
        maintenanceId: id,
        partName: payload.partName,
        quantity: payload.quantity,
        unitCost: String(payload.unitCost),
        totalCost: String(totalPartCost),
      })

      // Update parts_cost and total_cost in the record
      const newPartsCost = Number(record.partsCost) + totalPartCost
      const newTotalCost = newPartsCost + Number(record.laborCost)

      // Automatically change status to in_progress if it was pending
      const newStatus = record.status === 'pending' ? 'in_progress' : record.status
      const startedAt = record.status === 'pending' ? new Date() : record.startedAt

      await tx.update(maintenanceRecords)
        .set({
          partsCost: String(newPartsCost),
          totalCost: String(newTotalCost),
          status: newStatus,
          startedAt,
          updatedAt: new Date(),
        })
        .where(eq(maintenanceRecords.id, id))

      return { success: true }
    })
  }

  /**
   * Remove a spare part
   */
  async removePart(recordId: number, partId: number) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, recordId))
        .for('update')

      if (!record || record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل هذا السجل', 'INVALID_RECORD')
      }

      const [part] = await tx
        .select()
        .from(maintenanceParts)
        .where(and(eq(maintenanceParts.id, partId), eq(maintenanceParts.maintenanceId, recordId)))

      if (!part) {
        throw new NotFoundError('القطعة غير موجودة')
      }

      await tx.delete(maintenanceParts).where(eq(maintenanceParts.id, partId))

      const newPartsCost = Math.max(0, Number(record.partsCost) - Number(part.totalCost))
      const newTotalCost = newPartsCost + Number(record.laborCost)

      await tx.update(maintenanceRecords)
        .set({
          partsCost: String(newPartsCost),
          totalCost: String(newTotalCost),
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, recordId))

      return { success: true }
    })
  }

  /**
   * Update labor cost or descriptions
   */
  async updateRecord(id: number, updates: { laborCost?: number, problemDescription?: string, repairDescription?: string, status?: 'pending' | 'in_progress' }) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل سجل صيانة مغلق', 'ALREADY_COMPLETED')
      }

      const dataToUpdate: any = { updatedAt: new Date() }
      
      if (updates.problemDescription !== undefined) {
        dataToUpdate.problemDescription = updates.problemDescription
      }
      if (updates.repairDescription !== undefined) {
        dataToUpdate.repairDescription = updates.repairDescription
      }
      if (updates.status !== undefined) {
        dataToUpdate.status = updates.status
        if (updates.status === 'in_progress' && record.status === 'pending' && !record.startedAt) {
          dataToUpdate.startedAt = new Date()
        }
      }
      if (updates.laborCost !== undefined) {
        dataToUpdate.laborCost = String(updates.laborCost)
        dataToUpdate.totalCost = String(Number(record.partsCost) + updates.laborCost)
      }

      await tx.update(maintenanceRecords)
        .set(dataToUpdate)
        .where(eq(maintenanceRecords.id, id))

      return { success: true }
    })
  }

  /**
   * Complete the maintenance record and transition skate to 'available' (DEC-007)
   */
  async completeRecord(id: number, userId: number, payload: CompleteMaintenanceRecordPayload) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('طلب الصيانة مغلق بالفعل', 'ALREADY_COMPLETED')
      }

      // Lock skate
      const [skate] = await tx
        .select()
        .from(skates)
        .where(eq(skates.id, record.skateId))
        .for('update')

      if (!skate) {
        throw new NotFoundError('الزلاجة غير موجودة')
      }

      const repairDesc = payload.repairDescription || record.repairDescription
      if (!repairDesc) {
        throw new BusinessRuleError('يجب إدخال وصف الإصلاح قبل إغلاق الطلب', 'MISSING_DESCRIPTION')
      }

      // Mark record as completed
      await tx.update(maintenanceRecords)
        .set({
          status: 'completed',
          repairDescription: repairDesc,
          completedBy: userId,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, id))

      // Enforce DEC-007: Skate returns to 'available'
      await tx.update(skates)
        .set({
          status: 'available',
          updatedAt: new Date()
        })
        .where(eq(skates.id, skate.id))

      // No treasury movement in Phase 09 per owner decision.

      return { success: true }
    })
  }
}

export const maintenanceService = new MaintenanceService()
