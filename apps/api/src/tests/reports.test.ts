import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { sql } from 'drizzle-orm'

describe('Reports API', () => {
  let adminToken: string
  let cashierToken: string
  let today: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@koshkskate.com', password: 'Koshk@12345' })
    
    adminToken = res.body?.data?.accessToken || ''
    
    try {
      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cashier@koshkskate.com', password: 'Koshk@12345' })
      cashierToken = res2.body?.data?.accessToken || ''
    } catch {
      // If no cashier exists in tests, it's fine for now, we'll test without token
    }
    
    const d = new Date()
    today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  it('should return 401 without auth', async () => {
    const res = await request(app).get(`/api/v1/reports/overview?startDate=${today}&endDate=${today}`)
    expect(res.status).toBe(401)
  })

  it('should fetch overview report successfully', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/overview?startDate=${today}&endDate=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('totalRevenue')
    expect(res.body.data).toHaveProperty('totalRentals')
  })

  it('should fetch operating financial report', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/operating-financial?startDate=${today}&endDate=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('operatingResult')
    expect(res.body.data).toHaveProperty('totalRevenue')
    expect(res.body.data).toHaveProperty('totalExpenses')
    expect(res.body.data.operatingResult).toBe(res.body.data.totalRevenue - res.body.data.totalExpenses)
  })

  it('should fail with invalid dates', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/overview?startDate=invalid&endDate=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(400)
  })

  it('should fetch detailed list reports with pagination', async () => {
    const endpoints = [
      '/rentals', '/late', '/damages', '/maintenance', '/customers', '/cashiers', '/skate-performance'
    ]
    
    for (const endpoint of endpoints) {
      const res = await request(app)
        .get(`/api/v1/reports${endpoint}?startDate=${today}&endDate=${today}&page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
      
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.data)).toBe(true)
      expect(res.body.data.meta).toHaveProperty('total')
    }
  })
})
