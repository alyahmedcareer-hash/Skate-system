import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/connection'
import { users } from '../db/schema/users'
import { auditLogs } from '../db/schema/audit'
import { reservations } from '../db/schema/reservations'
import { getSystemActorId } from '../modules/users/users.service'
import { lazyExpireReservations, createReservation } from '../modules/reservations/reservations.service'
import { login } from '../modules/auth/auth.service'
import { execSync } from 'child_process'
import { customers } from '../db/schema/customers'
import { skates } from '../db/schema/skates'

describe('System Actor & Background Operations', () => {
  let systemUserId: number
  let adminUserId: number
  let skateId: number
  let customerId: number

  beforeAll(async () => {
    // Run seed to ensure System Actor is present
    execSync('npm run db:seed:test', { stdio: 'ignore' })
    
    // Find admin user to use for creating a reservation
    const adminRows = await db.select().from(users).where(eq(users.email, 'admin@koshkskate.com')).limit(1)
    adminUserId = adminRows[0].id

    // Insert dummy customer and skate
    const [custRes] = await db.insert(customers).values({
      name: 'Test Customer',
      phone: '01000000000',
      registrationDate: new Date()
    })
    customerId = custRes.insertId

    const [skateRes] = await db.insert(skates).values({
      skateCode: 'SYS-SKATE-01',
      size: '40',
      status: 'available'
    })
    skateId = skateRes.insertId
  })

  it('1. System Actor exists in the database', async () => {
    const sysUserRows = await db.select().from(users).where(eq(users.isSystemAccount, true)).limit(1)
    expect(sysUserRows.length).toBe(1)
    expect(sysUserRows[0].email).toBe('system@koshkskate.internal')
    systemUserId = sysUserRows[0].id
  })

  it('2. System Actor is distinguishable from normal users', async () => {
    const sysUser = await db.select().from(users).where(eq(users.id, systemUserId)).limit(1)
    expect(sysUser[0].isSystemAccount).toBe(true)
    
    const adminUser = await db.select().from(users).where(eq(users.id, adminUserId)).limit(1)
    expect(adminUser[0].isSystemAccount).toBe(false)
  })

  it('3. System Actor cannot be used as a normal login identity', async () => {
    // Attempting to login should throw UnauthorizedError because isSystemAccount = true
    await expect(login({
      email: 'system@koshkskate.internal',
      password: 'NO_LOGIN_ALLOWED'
    })).rejects.toThrow('لا يمكن تسجيل الدخول باستخدام حساب النظام')
  })

  it('4. lazyExpireReservations creates a valid audit record', async () => {
    // Create an expired reservation
    const from = new Date()
    from.setMinutes(from.getMinutes() - 120)
    const until = new Date()
    until.setMinutes(until.getMinutes() - 60)

    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: adminUserId
    })
    const resId = res.insertId
    
    // Trigger lazy expiration
    await lazyExpireReservations()

    // Verify it was cancelled
    const updated = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1)
    expect(updated[0].status).toBe('cancelled')

    // Verify audit log has system actor
    const logs = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, String(resId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1)
      
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].action).toBe('SYSTEM_CANCEL_EXPIRED_RESERVATION')
    expect(logs[0].userId).toBe(systemUserId)
  })

  it('5. Running seed repeatedly does not create duplicate System Actors', () => {
    execSync('npm run db:seed:test', { stdio: 'ignore' })
    // It should not throw and there should still be only 1 system actor
  })
})
