/**
 * KOSHK SKATE ERP — Phase 06 Payments & Treasury Tests
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll } from 'vitest'
import supertest from 'supertest'

import app from '../app.js'
import { db } from '../db/connection.js'
import { users } from '../db/schema/users.js'
import { eq, and } from 'drizzle-orm'

import { skates } from '../db/schema/skates.js'
import { customers } from '../db/schema/customers.js'
import { settings } from '../db/schema/settings.js'
import { rentals } from '../db/schema/rentals.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { rentalPayments, treasuryMovements, paymentMethods } from '../db/schema/payments.js'

const request = supertest(app)

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

let adminToken: string
let testSkateId: number
let testCustomerId: number
let testPaymentMethodId: number

async function adminLogin() {
  const res = await request.post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  return res.body.data.accessToken
}

beforeAll(async () => {
  adminToken = await adminLogin()
  
  // Create a test skate
  const [skateRes] = await db.insert(skates).values({ skateCode: 'PAY-TEST-01', size: '42', status: 'available' })
  testSkateId = (skateRes as any).insertId

  // Create a test customer
  const [custRes] = await db.insert(customers).values({ name: 'Test Pay Customer', phone: '01011112222', nationalId: '30000000000000', isActive: true, registrationDate: new Date() })
  testCustomerId = (custRes as any).insertId

  // Get a valid payment method
  const pmRes = await db.select({ id: paymentMethods.id }).from(paymentMethods).limit(1)
  testPaymentMethodId = pmRes[0]?.id || 1

  // --- Ensure Active Shifts ---
  const adminUserRes = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL))
  if (adminUserRes.length) {
    const existing = await db.select().from(cashierShifts).where(and(eq(cashierShifts.cashierId, adminUserRes[0].id), eq(cashierShifts.status, 'active'))).limit(1)
    if (!existing.length) {
      await db.insert(cashierShifts).values({ cashierId: adminUserRes[0].id, openingBalance: '0', status: 'active' })
    }
  }
})

import { sql } from 'drizzle-orm'

afterAll(async () => {
  // Hard cleanup
  await db.execute(sql`DELETE FROM rental_payments WHERE rental_id IN (SELECT id FROM rentals WHERE skate_id = ${testSkateId})`).catch(()=>{})
  await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id IN (SELECT id FROM rentals WHERE skate_id = ${testSkateId})`).catch(()=>{})
  await db.delete(rentals).where(eq(rentals.skateId, testSkateId)).catch(()=>{})
  await db.delete(skates).where(eq(skates.id, testSkateId)).catch(()=>{})
  await db.delete(customers).where(eq(customers.id, testCustomerId)).catch(()=>{})
})

describe('Payments & Treasury Endpoints', () => {
  it('GET /api/v1/payments/methods returns active payment methods', async () => {
    const res = await request
      .get('/api/v1/payments/methods')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0]).toHaveProperty('id')
    expect(res.body.data[0]).toHaveProperty('name')
  })

  it('GET /api/v1/payments/treasury-accounts requires treasury.view', async () => {
    const resAdmin = await request
      .get('/api/v1/payments/treasury-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(resAdmin.status).toBe(200)
    expect(resAdmin.body.success).toBe(true)
    expect(Array.isArray(resAdmin.body.data)).toBe(true)
    expect(resAdmin.body.data.length).toBeGreaterThan(0)
    expect(resAdmin.body.data[0]).toHaveProperty('balance')
  })
})

describe('Rental Payments & Cancellations', () => {
  it('TC-PAY-01: startRental rejects missing or empty payments array', async () => {
    const res = await request
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skateId: testSkateId, customerId: testCustomerId, durationMinutes: 30 }) // Missing payments
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('المدفوعات مطلوبة')
  })

  it('TC-PAY-02: startRental rejects incorrect payment total', async () => {
    const res = await request
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skateId: testSkateId, customerId: testCustomerId, durationMinutes: 30, payments: [{ paymentMethodId: testPaymentMethodId, amount: 10 }] }) // Should be 60
    expect(res.status).toBe(422) // Business rule error
    expect(res.body.error.code).toBe('INVALID_PAYMENT_TOTAL')
  })

  it('TC-PAY-03: startRental creates rental and payment records successfully', async () => {
    // 1 hour rental = 120 EGP (assuming 120/hr)
    const [rateSetting] = await db.select().from(settings).where(eq(settings.key, 'rental_hourly_rate')).limit(1)
    const rate = parseFloat(rateSetting?.value || '120')
    const amount = rate

    const res = await request
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skateId: testSkateId, customerId: testCustomerId, durationMinutes: 60, payments: [{ paymentMethodId: testPaymentMethodId, amount }] })
    expect(res.status).toBe(201)
    
    const rentalId = res.body.data.id

    // Check payment record
    const [paymentRow] = await db.select().from(rentalPayments).where(eq(rentalPayments.rentalId, rentalId))
    expect(paymentRow).toBeTruthy()
    expect(parseFloat(String(paymentRow.amount))).toBe(amount)

    // Check treasury movement
    const [movementRow] = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, rentalId))
    expect(movementRow).toBeTruthy()
    expect(movementRow.type).toBe('in')
    expect(parseFloat(String(movementRow.amount))).toBe(amount)
  })

  it('TC-PAY-04: cancelRental automatically refunds upfront payments', async () => {
    // We will cancel the rental created in TC-PAY-03
    const [rentalRow] = await db.select().from(rentals).where(eq(rentals.skateId, testSkateId)).limit(1)
    const rentalId = rentalRow.id

    const res = await request
      .post(`/api/v1/rentals/${rentalId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)

    // Verify status is cancelled
    const [updatedRental] = await db.select().from(rentals).where(eq(rentals.id, rentalId))
    expect(updatedRental.status).toBe('cancelled')

    // Verify refund movement (should be out)
    const movements = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, rentalId))
    expect(movements.length).toBe(2) // 1 in, 1 out
    const outMovement = movements.find(m => m.type === 'out')
    expect(outMovement).toBeTruthy()
    expect(parseFloat(String(outMovement!.amount))).toBe(parseFloat(String(movements[0].amount)))
  })
})
