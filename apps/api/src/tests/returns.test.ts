import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../app.js'
import { db, pool } from '../db/connection.js'
import { users, userRoles, roles, permissions, rolePermissions } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'

describe('Returns API (Phase 07)', () => {
  let adminToken: string
  let cashierToken: string
  let noWaiveToken: string
  let skateId: number
  let customerId: number
  let pmId: number

  async function createUserAndLogin(email: string, roleName: string | null): Promise<string> {
    const connection = await pool.getConnection()
    try {
      const password = 'TestPassword123'
      const hash = await bcrypt.hash(password, 12)
      
      await connection.execute("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = ?)", [email])
      await connection.execute("DELETE FROM maintenance_records WHERE created_by IN (SELECT id FROM users WHERE email = ?)", [email])
      await connection.execute("DELETE FROM inspections WHERE inspected_by IN (SELECT id FROM users WHERE email = ?)", [email])
      await connection.execute("DELETE FROM users WHERE email = ?", [email])
      
      const [uRes] = await connection.execute<any>(
        "INSERT INTO users (name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())",
        ['Test User', email, hash]
      )
      const userId = uRes.insertId

      if (roleName) {
        const [roleRows] = await connection.execute<any>("SELECT id FROM roles WHERE name = ?", [roleName])
        if (roleRows.length > 0) {
          await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleRows[0].id])
        }
      }

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password })
      
      return res.body.data.accessToken as string
    } finally {
      connection.release()
    }
  }

  beforeAll(async () => {
    // Need a custom role for Cashier (can return, cannot waive)
    // Actually, DEFAULT_ROLES has Administrator and Cashier.
    adminToken = await createUserAndLogin('admin.return@koshkskate.com', 'Administrator')
    cashierToken = await createUserAndLogin('cashier.return@koshkskate.com', 'Cashier')
    noWaiveToken = await createUserAndLogin('none.return@koshkskate.com', null) // No role = no permissions

    const connection = await pool.getConnection()
    try {
      // Clean up for tests
      await connection.execute('DELETE FROM late_fee_records')
      await connection.execute('DELETE FROM inspections')
      await connection.execute('DELETE FROM treasury_movements')
      await connection.execute('DELETE FROM rental_payments')
      await connection.execute('DELETE FROM rentals')
      await connection.execute('DELETE FROM skates')
      await connection.execute('DELETE FROM customers')

      // Insert customer
      const [cRes] = await connection.execute<any>(
        "INSERT INTO customers (name, phone, registration_date, is_active, created_at, updated_at) VALUES ('Test Cust', '010', CURDATE(), 1, NOW(), NOW())"
      )
      customerId = cRes.insertId

      // Insert skate
      const [sRes] = await connection.execute<any>(
        "INSERT INTO skates (skate_code, size, status, created_at, updated_at) VALUES ('TEST-RET-01', '42', 'available', NOW(), NOW())"
      )
      skateId = sRes.insertId

      // Get PM
      const [pmRows] = await connection.execute<any>("SELECT id FROM payment_methods WHERE name = 'Main Cash' LIMIT 1")
      pmId = pmRows[0].id
    } finally {
      connection.release()
    }
  })

  afterAll(async () => {
    const connection = await pool.getConnection()
    try {
      await connection.execute('DELETE FROM late_fee_records')
      await connection.execute('DELETE FROM maintenance_records')
      await connection.execute('DELETE FROM inspections')
      await connection.execute('DELETE FROM treasury_movements')
      await connection.execute('DELETE FROM rental_payments')
      await connection.execute('DELETE FROM rentals')
      await connection.execute('DELETE FROM skates')
      await connection.execute('DELETE FROM customers')
    } finally {
      connection.release()
    }
  })

  async function createActiveRental(minutes: number = 15, expectedEndOffsetMs: number = 0) {
    const connection = await pool.getConnection()
    try {
      // make skate available
      await connection.execute("UPDATE skates SET status = 'available' WHERE id = ?", [skateId])
      
      const expectedEnd = new Date(Date.now() + expectedEndOffsetMs)
      
      const [rRes] = await connection.execute<any>(
        `INSERT INTO rentals (rental_code, skate_id, customer_id, cashier_id, duration_minutes, price_per_hour, rental_amount, started_at, expected_end_at, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 120, 30, NOW(), ?, 'active', NOW(), NOW())`,
        [`RN-${Date.now()}`, skateId, customerId, minutes, expectedEnd]
      )
      
      await connection.execute("UPDATE skates SET status = 'rented' WHERE id = ?", [skateId])
      
      return rRes.insertId
    } finally {
      connection.release()
    }
  }

  it('should return 401 without token', async () => {
    const res = await request(app).post('/api/v1/rentals/999/return').send({})
    expect(res.status).toBe(401)
  })

  it('should return 403 without rentals.return permission', async () => {
    const res = await request(app)
      .post('/api/v1/rentals/999/return')
      .set('Authorization', `Bearer ${noWaiveToken}`)
      .send({})
    expect(res.status).toBe(403)
  })

  it('should return on-time successfully with no fees', async () => {
    const rentalId = await createActiveRental(15, 15 * 60000) // ends in 15 mins
    
    const payload = {
      waivedFee: 0,
      payments: [],
      inspection: {
        wheelsCondition: 'good',
        brakeCondition: 'good',
        strapCondition: 'good',
        bearingsCondition: 'good',
        bodyCondition: 'good',
        maintenanceRequired: false
      }
    }

    const res = await request(app)
      .post(`/api/v1/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('returned')

    // Verify skate status
    const connection = await pool.getConnection()
    const [skateRows] = await connection.execute<any>('SELECT status FROM skates WHERE id = ?', [skateId])
    connection.release()
    expect(skateRows[0].status).toBe('available')
  })

  it('should reject return if late fee accounting is wrong', async () => {
    // ends 10 mins ago = late by 10 mins -> 20 EGP fee
    const rentalId = await createActiveRental(15, -10 * 60000)
    
    const payload = {
      waivedFee: 0,
      payments: [{ paymentMethodId: pmId, amount: 10 }], // Underpayment
      inspection: {
        wheelsCondition: 'good',
        brakeCondition: 'good',
        strapCondition: 'good',
        bearingsCondition: 'good',
        bodyCondition: 'good',
        maintenanceRequired: false
      }
    }

    const res = await request(app)
      .post(`/api/v1/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(payload)

    expect(res.status).toBe(422) // BusinessRuleError handles wrong late fee total
  })

  it('should reject waiver if user lacks waivers.approve permission', async () => {
    // ends 10 mins ago -> 20 EGP fee
    const rentalId = await createActiveRental(15, -10 * 60000)
    
    const payload = {
      waivedFee: 20, // Waiving the fee!
      waiverReason: 'Test',
      payments: [],
      inspection: {
        wheelsCondition: 'good',
        brakeCondition: 'good',
        strapCondition: 'good',
        bearingsCondition: 'good',
        bodyCondition: 'good',
        maintenanceRequired: false
      }
    }

    const res = await request(app)
      .post(`/api/v1/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${cashierToken}`) // Cashier lacks waive perm
      .send(payload)

    expect(res.status).toBe(403)
    expect(res.body.error.message).toMatch(/لا تملك صلاحية الموافقة/)
  })

  it('should process late return with full fee payment', async () => {
    // late by 10 mins
    const rentalId = await createActiveRental(15, -10 * 60000)
    
    // Dynamically calculate what the backend will expect because of mysql time truncation
    const connectionForCheck = await pool.getConnection()
    let expectedFee = 20
    try {
      const [rRows] = await connectionForCheck.execute<any>('SELECT expected_end_at FROM rentals WHERE id = ?', [rentalId])
      const expectedEnd = new Date(rRows[0].expected_end_at).getTime()
      const diffMs = Date.now() - expectedEnd
      expectedFee = Math.ceil(diffMs / 60000) * 2
    } finally {
      connectionForCheck.release()
    }

    const payload = {
      waivedFee: 0,
      payments: [{ paymentMethodId: pmId, amount: expectedFee }],
      inspection: {
        wheelsCondition: 'minor_damage',
        brakeCondition: 'good',
        strapCondition: 'good',
        bearingsCondition: 'good',
        bodyCondition: 'good',
        maintenanceRequired: true
      }
    }

    const res = await request(app)
      .post(`/api/v1/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)

    if (res.status !== 200) console.log('FULL FEE TEST ERROR:', res.body)
    expect(res.status).toBe(200)

    const connection = await pool.getConnection()
    try {
      // Check skate status
      const [skateRows] = await connection.execute<any>('SELECT status FROM skates WHERE id = ?', [skateId])
      expect(skateRows[0].status).toBe('maintenance')

      // Check inspection
      const [insRows] = await connection.execute<any>('SELECT * FROM inspections WHERE rental_id = ?', [rentalId])
      expect(insRows.length).toBe(1)
      expect(insRows[0].wheels_condition).toBe('minor_damage')

      // Check late fee record
      const [lfRows] = await connection.execute<any>('SELECT * FROM late_fee_records WHERE rental_id = ?', [rentalId])
      expect(lfRows.length).toBe(1)
      expect(parseFloat(lfRows[0].calculated_fee)).toBe(expectedFee)
      expect(parseFloat(lfRows[0].collected_fee)).toBe(expectedFee)

      // Check payments & treasury
      const [pmtRows] = await connection.execute<any>("SELECT * FROM rental_payments WHERE rental_id = ? AND payment_type = 'late_fee'", [rentalId])
      expect(pmtRows.length).toBe(1)
      expect(parseFloat(pmtRows[0].amount)).toBe(expectedFee)

      const [trRows] = await connection.execute<any>("SELECT * FROM treasury_movements WHERE reference_id = ? AND reference_type = 'late_fee_payment'", [rentalId])
      expect(trRows.length).toBe(1)
      expect(parseFloat(trRows[0].amount)).toBe(expectedFee)
    } finally {
      connection.release()
    }
  })

  it('should process late return with full waiver', async () => {
    // late by 10 mins
    const rentalId = await createActiveRental(15, -10 * 60000)
    
    // Dynamically calculate what the backend will expect because of mysql time truncation
    const connectionForCheck = await pool.getConnection()
    let expectedFee = 20
    try {
      const [rRows] = await connectionForCheck.execute<any>('SELECT expected_end_at FROM rentals WHERE id = ?', [rentalId])
      const expectedEnd = new Date(rRows[0].expected_end_at).getTime()
      const diffMs = Date.now() - expectedEnd
      expectedFee = Math.ceil(diffMs / 60000) * 2
    } finally {
      connectionForCheck.release()
    }
    
    const payload = {
      waivedFee: expectedFee,
      waiverReason: 'Apology to customer',
      payments: [],
      inspection: {
        wheelsCondition: 'good',
        brakeCondition: 'good',
        strapCondition: 'good',
        bearingsCondition: 'good',
        bodyCondition: 'good',
        maintenanceRequired: false
      }
    }

    const res = await request(app)
      .post(`/api/v1/rentals/${rentalId}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)

    expect(res.status).toBe(200)

    const connection = await pool.getConnection()
    try {
      const [lfRows] = await connection.execute<any>('SELECT * FROM late_fee_records WHERE rental_id = ?', [rentalId])
      expect(lfRows.length).toBe(1)
      expect(parseFloat(lfRows[0].calculated_fee)).toBe(expectedFee)
      expect(parseFloat(lfRows[0].waived_fee)).toBe(expectedFee)
      expect(parseFloat(lfRows[0].collected_fee)).toBe(0)

      // Ensure no late fee payments or treasury movements created for 0 amount
      const [pmtRows] = await connection.execute<any>("SELECT * FROM rental_payments WHERE rental_id = ? AND payment_type = 'late_fee'", [rentalId])
      expect(pmtRows.length).toBe(0)
    } finally {
      connection.release()
    }
  })
})
