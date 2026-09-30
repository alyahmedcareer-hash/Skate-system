import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, roles, userRoles } from '../db/schema/users.js'
import { eq } from 'drizzle-orm'
import { createAuthToken } from '../modules/auth/auth.service.js'

describe('Dashboard API (Phase 17)', () => {
  let adminToken: string
  let cashierToken: string
  const testStartDate = '2026-09-01'
  const testEndDate = '2026-09-30'

  beforeAll(async () => {
    // 1. Get admin token
    const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
    const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'
    const adminRes = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    adminToken = adminRes.body.data.accessToken

    // 2. Setup Cashier
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.default.hash('123456', 10)
    
    // Check or create cashier user
    let cashier = await db.select().from(users).where(eq(users.email, 'cashier_dash@koshk.local')).limit(1)
    if (cashier.length === 0) {
      const [insertRes] = await db.insert(users).values({ name: 'Cashier Dash', email: 'cashier_dash@koshk.local', passwordHash: hash })
      // Give cashier role
      const cashierRole = await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1)
      if (cashierRole[0]) {
        await db.insert(userRoles).values({ userId: insertRes.insertId, roleId: cashierRole[0].id })
      }
    }
    const cashierLogin = await request(app).post('/api/v1/auth/login').send({ email: 'cashier_dash@koshk.local', password: '123456' })
    cashierToken = cashierLogin.body.data.accessToken
  })

  it('Admin can view full dashboard', async () => {
    const res = await request(app)
      .get(`/api/v1/dashboard/kpis?startDate=${testStartDate}&endDate=${testEndDate}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.kpis).toHaveProperty('revenue')
    expect(res.body.data.kpis).toHaveProperty('operatingResult')
    expect(res.body.data.charts).toHaveProperty('revenueOverTime')
  })

  it('Cashier cannot view financial KPIs', async () => {
    const res = await request(app)
      .get(`/api/v1/dashboard/kpis?startDate=${testStartDate}&endDate=${testEndDate}`)
      .set('Authorization', `Bearer ${cashierToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // Cashier can see operational KPIs
    expect(res.body.data.kpis).toHaveProperty('activeRentals')
    // Cashier cannot see financial KPIs
    expect(res.body.data.kpis).not.toHaveProperty('revenue')
    expect(res.body.data.kpis).not.toHaveProperty('operatingResult')
    expect(res.body.data.charts).not.toHaveProperty('revenueOverTime')
  })

  it('Requires startDate and endDate', async () => {
    const res = await request(app)
      .get(`/api/v1/dashboard/kpis`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
