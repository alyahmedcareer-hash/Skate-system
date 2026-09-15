/**
 * KOSHK SKATE ERP — Customers Module Integration Tests
 * Phase 04 — Customers Module
 *
 * Tests:
 *   TC-CUST-01:  Create customer — all fields valid → 201
 *   TC-CUST-02:  Create customer — missing name → 400
 *   TC-CUST-03:  Create customer — missing phone → 400
 *   TC-CUST-04:  Create customer — duplicate National ID → 409
 *   TC-CUST-05:  List customers — paginated → 200 with pagination object
 *   TC-CUST-06:  List customers — search by name → matching results
 *   TC-CUST-07:  List customers — search by phone → matching results
 *   TC-CUST-08:  List customers — search by National ID → matching results
 *   TC-CUST-09:  List customers — default excludes inactive customers
 *   TC-CUST-10:  Get customer by ID → 200 with full nationalId (not masked)
 *   TC-CUST-11:  Get customer — not found → 404
 *   TC-CUST-12:  Update customer — valid data → 200
 *   TC-CUST-13:  Update customer — not found → 404
 *   TC-CUST-14:  Deactivate customer — succeeds → isActive = false
 *   TC-CUST-15:  Activate customer — succeeds → isActive = true
 *   TC-CUST-16:  Activate already-active customer — idempotent → 200
 *   TC-CUST-17:  Update customer to duplicate National ID → 409
 *
 *   TC-CUST-VAL-01: Create — name exceeds 255 chars → 400
 *   TC-CUST-VAL-02: Create — phone exceeds 20 chars → 400
 *   TC-CUST-VAL-03: Create — nationalId exceeds 50 chars → 400
 *
 *   TC-CUST-RBAC-01: No token → 401 on all endpoints
 *   TC-CUST-RBAC-02: Missing customers.view → 403 on GET list
 *   TC-CUST-RBAC-03: Missing customers.create → 403 on POST
 *   TC-CUST-RBAC-04: Missing customers.edit → 403 on PUT
 *   TC-CUST-RBAC-05: Missing customers.deactivate → 403 on deactivate
 *   TC-CUST-RBAC-06: Cashier with customers.view can list customers
 *   TC-CUST-RBAC-07: Cashier CANNOT deactivate (403)
 *   TC-CUST-RBAC-08: Administrator has all customer permissions
 *
 * Requires:
 *   - Local MySQL DB `koshk_skate` with seed data applied (including customers.deactivate)
 *   - `apps/api/.env` with valid credentials
 *
 * IMPORTANT: Tests use the real DB. They do NOT mock the DB or JWT.
 * Each test set cleans up its own data in afterAll.
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { eq, like } from 'drizzle-orm'

import app from '../app.js'
import { db } from '../db/connection.js'
import { customers, users, roles, permissions, userRoles, rolePermissions } from '../db/schema/index.js'

const request = supertest(app)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

// Unique test data to avoid clashing with other tests
const TEST_NATIONAL_ID  = 'TEST99999999901'
const TEST_NATIONAL_ID2 = 'TEST99999999902'
const TEST_NATIONAL_ID3 = 'TEST99999999903'  // For TC-CUST-17 (duplicate NID on update)
const TEST_PHONE        = '01099999999'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function adminLogin(): Promise<string> {
  const res = await request.post('/api/v1/auth/login').send({
    email:    ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  expect(res.status).toBe(200)
  return res.body.data.accessToken as string
}

// ---------------------------------------------------------------------------
// Test Setup: IDs for cleanup
// ---------------------------------------------------------------------------

let adminToken = ''
let createdCustomerIds: number[] = []
let cashierUserId = 0
let nopermUserId  = 0
let cashierToken  = ''
let nopermToken   = ''

// ---------------------------------------------------------------------------
// Setup and Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  adminToken = await adminLogin()

  // Create a Cashier test user for RBAC tests
  const cashierEmail = 'test.cust.cashier@koshkskate.com'
  const cashierRes = await request
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'كاشير اختبار العملاء', email: cashierEmail, password: 'TestPass1!', roleIds: [] })

  if (cashierRes.status === 201) {
    cashierUserId = cashierRes.body.data.id
  } else {
    // May already exist from a prior run
    const existing = await db.select().from(users).where(eq(users.email, cashierEmail)).limit(1)
    if (existing[0]) cashierUserId = existing[0].id
  }

  // Assign Cashier role to cashierUser
  const cashierRole = (await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1))[0]
  if (cashierRole && cashierUserId) {
    const alreadyAssigned = await db.select().from(userRoles)
      .where(eq(userRoles.userId, cashierUserId)).limit(1)
    if (!alreadyAssigned.length) {
      await db.insert(userRoles).values({ userId: cashierUserId, roleId: cashierRole.id })
    }
  }

  // Login as cashier
  const cashierLoginRes = await request.post('/api/v1/auth/login').send({ email: cashierEmail, password: 'TestPass1!' })
  if (cashierLoginRes.status === 200) cashierToken = cashierLoginRes.body.data.accessToken

  // Create a no-permission user for RBAC tests
  const nopermEmail = 'test.cust.noperm@koshkskate.com'
  const nopermRes = await request
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'بدون صلاحية', email: nopermEmail, password: 'TestPass1!', roleIds: [] })

  if (nopermRes.status === 201) {
    nopermUserId = nopermRes.body.data.id
  } else {
    const existing = await db.select().from(users).where(eq(users.email, nopermEmail)).limit(1)
    if (existing[0]) nopermUserId = existing[0].id
  }

  const nopermLoginRes = await request.post('/api/v1/auth/login').send({ email: nopermEmail, password: 'TestPass1!' })
  if (nopermLoginRes.status === 200) nopermToken = nopermLoginRes.body.data.accessToken
})

afterAll(async () => {
  // Clean up test customers
  for (const id of createdCustomerIds) {
    await db.delete(customers).where(eq(customers.id, id))
  }
  // Also clean up any test customers by national_id in case of leftover runs
  await db.delete(customers).where(eq(customers.nationalId, TEST_NATIONAL_ID))
  await db.delete(customers).where(eq(customers.nationalId, TEST_NATIONAL_ID2))
  await db.delete(customers).where(eq(customers.nationalId, TEST_NATIONAL_ID3))

  // Clean up test users
  if (cashierUserId) {
    await db.delete(userRoles).where(eq(userRoles.userId, cashierUserId))
    await db.delete(users).where(eq(users.id, cashierUserId))
  }
  if (nopermUserId) {
    await db.delete(users).where(eq(users.id, nopermUserId))
  }
})

// ---------------------------------------------------------------------------
// CRUD Tests
// ---------------------------------------------------------------------------

describe('Customers — CRUD', () => {

  it('TC-CUST-01: Create customer — all fields valid → 201', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:       'محمد تجريبي',
        phone:      TEST_PHONE,
        nationalId: TEST_NATIONAL_ID,
        notes:      'ملاحظة اختبار',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      name:       'محمد تجريبي',
      phone:      TEST_PHONE,
      nationalId: TEST_NATIONAL_ID,
      notes:      'ملاحظة اختبار',
      isActive:   true,
    })
    expect(res.body.data.id).toBeTypeOf('number')
    expect(res.body.data.registrationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    createdCustomerIds.push(res.body.data.id)
  })

  it('TC-CUST-02: Create customer — missing name → 400', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '01011111111' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-03: Create customer — missing phone → 400', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'اختبار بدون هاتف' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-04: Create customer — duplicate National ID → 409', async () => {
    // First, create a second customer with the same National ID
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:       'عميل مكرر',
        phone:      '01012345678',
        nationalId: TEST_NATIONAL_ID,  // same as TC-CUST-01
      })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-05: List customers — paginated → 200 with pagination', async () => {
    const res = await request
      .get('/api/v1/customers?page=1&perPage=10')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.pagination).toMatchObject({
      page:    1,
      perPage: 10,
    })
    expect(typeof res.body.pagination.total).toBe('number')
    expect(typeof res.body.pagination.totalPages).toBe('number')
  })

  it('TC-CUST-06: List customers — search by name', async () => {
    const res = await request
      .get('/api/v1/customers?q=محمد تجريبي')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const found = (res.body.data as Array<{ name: string }>).some(c => c.name === 'محمد تجريبي')
    expect(found).toBe(true)
  })

  it('TC-CUST-07: List customers — search by phone', async () => {
    const res = await request
      .get(`/api/v1/customers?q=${TEST_PHONE}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const found = (res.body.data as Array<{ phone: string }>).some(c => c.phone === TEST_PHONE)
    expect(found).toBe(true)
  })

  it('TC-CUST-08: List customers — search by National ID (last 4 digits) shows masked value', async () => {
    const res = await request
      .get(`/api/v1/customers?q=${TEST_NATIONAL_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    // List DTO has nationalIdMasked, NOT nationalId
    const item = (res.body.data as Array<{ nationalIdMasked: string; name: string }>)
      .find(c => c.name === 'محمد تجريبي')
    expect(item).toBeDefined()
    expect(item!.nationalIdMasked).toMatch(/^\*+\d{4}$/)  // masked format
    // Full nationalId must NOT be in list response
    expect((item as Record<string, unknown>)['nationalId']).toBeUndefined()
  })

  it('TC-CUST-09: List customers — default excludes inactive', async () => {
    // Deactivate our test customer first
    const deactivateRes = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(deactivateRes.status).toBe(200)

    // Default list (isActive=1) should not include it
    const listRes = await request
      .get(`/api/v1/customers?q=${TEST_NATIONAL_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(listRes.status).toBe(200)
    const found = (listRes.body.data as Array<{ name: string }>).some(c => c.name === 'محمد تجريبي')
    expect(found).toBe(false)

    // isActive=all should include it
    const allRes = await request
      .get(`/api/v1/customers?q=${TEST_NATIONAL_ID}&isActive=all`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(allRes.status).toBe(200)
    const foundInAll = (allRes.body.data as Array<{ name: string }>).some(c => c.name === 'محمد تجريبي')
    expect(foundInAll).toBe(true)

    // Reactivate for subsequent tests
    await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
  })

  it('TC-CUST-10: Get customer by ID → 200 with full nationalId', async () => {
    const res = await request
      .get(`/api/v1/customers/${createdCustomerIds[0]}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      name:       'محمد تجريبي',
      phone:      TEST_PHONE,
      nationalId: TEST_NATIONAL_ID,  // full value — not masked
      isActive:   true,
    })
    // Must NOT have nationalIdMasked in profile
    expect((res.body.data as Record<string, unknown>)['nationalIdMasked']).toBeUndefined()
  })

  it('TC-CUST-11: Get customer — not found → 404', async () => {
    const res = await request
      .get('/api/v1/customers/999999999')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-12: Update customer — valid data → 200', async () => {
    const res = await request
      .put(`/api/v1/customers/${createdCustomerIds[0]}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'ملاحظة محدثة' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.notes).toBe('ملاحظة محدثة')
    expect(res.body.data.name).toBe('محمد تجريبي')  // unchanged
  })

  it('TC-CUST-13: Update customer — not found → 404', async () => {
    const res = await request
      .put('/api/v1/customers/999999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'لا يوجد' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-14: Deactivate customer → isActive = false', async () => {
    const res = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.isActive).toBe(false)
  })

  it('TC-CUST-15: Activate customer → isActive = true', async () => {
    const res = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.isActive).toBe(true)
  })

  it('TC-CUST-16: Activate already-active customer — idempotent → 200', async () => {
    // Customer is already active from TC-CUST-15
    const res = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.isActive).toBe(true)
  })

  it('TC-CUST-17: Update customer to duplicate National ID → 409', async () => {
    // Create Customer B with a distinct National ID (TEST_NATIONAL_ID3)
    const createB = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:       'عميل تجريبي باء',
        phone:      '01088888888',
        nationalId: TEST_NATIONAL_ID3,
      })
    expect(createB.status).toBe(201)
    const customerBId: number = createB.body.data.id
    createdCustomerIds.push(customerBId)

    // Attempt to update Customer B to TEST_NATIONAL_ID (already used by Customer A from TC-CUST-01)
    const updateRes = await request
      .put(`/api/v1/customers/${customerBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nationalId: TEST_NATIONAL_ID })

    expect(updateRes.status).toBe(409)
    expect(updateRes.body.success).toBe(false)

    // Verify Customer B is unchanged (still has its original National ID)
    const verifyB = await request
      .get(`/api/v1/customers/${customerBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(verifyB.status).toBe(200)
    expect(verifyB.body.data.nationalId).toBe(TEST_NATIONAL_ID3)  // unchanged
  })

  // ---------------------------------------------------------------------------
  // Length validation tests
  // ---------------------------------------------------------------------------

  it('TC-CUST-VAL-01: Create — name exceeds 255 chars → 400', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:  'أ'.repeat(256),
        phone: '01011111111',
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-VAL-02: Create — phone exceeds 20 chars → 400', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:  'اختبار هاتف طويل',
        phone: '0'.repeat(21),
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-VAL-03: Create — nationalId exceeds 50 chars → 400', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:       'اختبار رقم قومي طويل',
        phone:      '01011111111',
        nationalId: '1'.repeat(51),
      })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// RBAC Tests
// ---------------------------------------------------------------------------

describe('Customers — RBAC', () => {

  it('TC-CUST-RBAC-01: No token → 401', async () => {
    const [r1, r2, r3] = await Promise.all([
      request.get('/api/v1/customers'),
      request.post('/api/v1/customers').send({ name: 'x', phone: '01011111111' }),
      request.get('/api/v1/customers/1'),
    ])
    expect(r1.status).toBe(401)
    expect(r2.status).toBe(401)
    expect(r3.status).toBe(401)
  })

  it('TC-CUST-RBAC-02: Missing customers.view → 403 on GET list', async () => {
    const res = await request
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${nopermToken}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-RBAC-03: Missing customers.create → 403 on POST', async () => {
    const res = await request
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ name: 'غير مصرح', phone: '01022222222' })

    expect(res.status).toBe(403)
  })

  it('TC-CUST-RBAC-04: Missing customers.edit → 403 on PUT', async () => {
    const res = await request
      .put(`/api/v1/customers/${createdCustomerIds[0]}`)
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ notes: 'غير مصرح' })

    expect(res.status).toBe(403)
  })

  it('TC-CUST-RBAC-05: Missing customers.deactivate → 403 on deactivate', async () => {
    const res = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/deactivate`)
      .set('Authorization', `Bearer ${nopermToken}`)

    expect(res.status).toBe(403)
  })

  it('TC-CUST-RBAC-06: Cashier with customers.view can list customers', async () => {
    const res = await request
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${cashierToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('TC-CUST-RBAC-07: Cashier CANNOT deactivate (403)', async () => {
    const res = await request
      .post(`/api/v1/customers/${createdCustomerIds[0]}/deactivate`)
      .set('Authorization', `Bearer ${cashierToken}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('TC-CUST-RBAC-08: Administrator has all customer permissions', async () => {
    const permKey = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, 'customers.deactivate'))
      .limit(1)

    expect(permKey.length).toBe(1)
    expect(permKey[0].module).toBe('customers')

    // Admin can list, create, view, edit, deactivate — verified in the CRUD tests above
    const listRes = await request
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(listRes.status).toBe(200)
  })
})
