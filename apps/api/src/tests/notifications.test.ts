import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { rentals } from '../db/schema/rentals.js'
import { skates } from '../db/schema/skates.js'
import { customers } from '../db/schema/customers.js'
import { users } from '../db/schema/users.js'
import { eq } from 'drizzle-orm'
import { ENDING_SOON_WINDOW_SECONDS } from '../modules/notifications/notifications.service.js'

describe('Notifications API', () => {
  let token: string
  let skateId: number
  let customerId: number
  let cashierId: number

  beforeAll(async () => {
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password: adminPassword })
    token = loginRes.body.data.accessToken
    
    // Create base data
    const [skateRes] = await db.insert(skates).values({ skateCode: 'NOTIF-SK-1', size: '40', status: 'available' })
    skateId = skateRes.insertId

    const [custRes] = await db.insert(customers).values({ name: 'Notif Customer', phone: '01000000000', idDocument: '111', isActive: true, registrationDate: new Date() })
    customerId = custRes.insertId

    const cashier = await db.select().from(users).limit(1)
    cashierId = cashier[0].id
  })

  afterAll(async () => {
    await db.delete(rentals).where(eq(rentals.customerId, customerId))
    await db.delete(customers).where(eq(customers.id, customerId))
    await db.delete(skates).where(eq(skates.id, skateId))
  })

  it('GET /api/v1/notifications returns empty array when no rentals exist', async () => {
    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeInstanceOf(Array)
  })

  it('identifies an ENDING_SOON rental', async () => {
    // 30 seconds remaining
    const now = new Date()
    const expectedEndAt = new Date(now.getTime() + 30000)

    const [rentRes] = await db.insert(rentals).values({
      rentalCode: 'RN-N1',
      skateId,
      customerId,
      cashierId,
      durationMinutes: 60,
      pricePerHour: '120.00',
      rentalAmount: '120.00',
      startedAt: now,
      expectedEndAt,
      status: 'active'
    })

    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    
    const notif = res.body.data.find((n: any) => n.rentalId === rentRes.insertId)
    expect(notif).toBeDefined()
    expect(notif.type).toBe('ENDING_SOON')
    expect(notif.remainingTime).toBeLessThanOrEqual(30)
    expect(notif.remainingTime).toBeGreaterThan(0)
    expect(notif.skate.skateCode).toBe('NOTIF-SK-1')
  })

  it('identifies an EXPIRED rental', async () => {
    // 10 seconds ago
    const now = new Date()
    const expectedEndAt = new Date(now.getTime() - 10000)

    const [rentRes] = await db.insert(rentals).values({
      rentalCode: 'RN-N2',
      skateId,
      customerId,
      cashierId,
      durationMinutes: 60,
      pricePerHour: '120.00',
      rentalAmount: '120.00',
      startedAt: new Date(now.getTime() - 60 * 60 * 1000),
      expectedEndAt,
      status: 'active'
    })

    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    
    const notif = res.body.data.find((n: any) => n.rentalId === rentRes.insertId)
    expect(notif).toBeDefined()
    expect(notif.type).toBe('EXPIRED')
    expect(notif.remainingTime).toBeLessThanOrEqual(0)
  })

  it('ignores normal rentals (e.g. 5 minutes remaining)', async () => {
    // 5 minutes remaining
    const now = new Date()
    const expectedEndAt = new Date(now.getTime() + 5 * 60000)

    const [rentRes] = await db.insert(rentals).values({
      rentalCode: 'RN-N3',
      skateId,
      customerId,
      cashierId,
      durationMinutes: 60,
      pricePerHour: '120.00',
      rentalAmount: '120.00',
      startedAt: now,
      expectedEndAt,
      status: 'active'
    })

    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    
    const notif = res.body.data.find((n: any) => n.rentalId === rentRes.insertId)
    expect(notif).toBeUndefined()
  })
})
