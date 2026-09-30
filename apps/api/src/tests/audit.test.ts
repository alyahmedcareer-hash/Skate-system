import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { auditLogs, users } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import { getValidAdminToken } from './utils/auth.js'
import { auditService } from '../modules/audit/audit.service.js'

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

describe('Audit Logs (Phase 16)', () => {
  let adminToken: string
  let adminId: number

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
    
    if (loginRes.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`)
    }
    
    adminToken = loginRes.body.data.accessToken

    const admin = await db.query.users.findFirst({
      where: eq(users.email, ADMIN_EMAIL)
    })
    adminId = admin!.id
  })

  afterAll(async () => {
    await db.delete(auditLogs).where(eq(auditLogs.entityType, 'test_entity'))
  })

  it('should log an action successfully', async () => {
    await auditService.log({
      userId: adminId,
      action: 'TEST_ACTION',
      entityType: 'test_entity',
      entityId: 'test_123',
      oldValue: { status: 'old' },
      newValue: { status: 'new' }
    })

    const logs = await db.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'test_123')
    })

    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('TEST_ACTION')
    expect(logs[0].entityType).toBe('test_entity')
    expect(logs[0].oldValue).toEqual({ status: 'old' })
  })

  it('should fetch audit logs via API', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toHaveProperty('total')
  })

  it('should deny access without audit.view permission', async () => {
    // Create a temporary user without roles
    const nopermEmail = 'test.audit.noperm@koshkskate.com'
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'بدون صلاحيات', email: nopermEmail, password: 'TestPass1!', roleIds: [] })

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: nopermEmail,
      password: 'TestPass1!'
    })
    
    await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .expect(403)
  })
})
