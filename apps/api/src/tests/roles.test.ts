/**
 * KOSHK SKATE ERP — Phase 02 RBAC Integration Tests
 * Phase 02 Remediation — OD-RBAC-001 / OD-RBAC-002 / OD-RBAC-003
 *
 * Tests:
 *   TC-ROLE-01: Admin can create a custom role → 201
 *   TC-ROLE-02: Duplicate role name → 409
 *   TC-ROLE-03: Missing role name → 400
 *   TC-ROLE-04: Admin can update custom role name → 200
 *   TC-ROLE-05: Cannot rename system role (OD-RBAC-002) → 403
 *   TC-ROLE-06: Duplicate name on update → 409
 *   TC-ROLE-07: Admin can delete custom role with no active users → 200
 *   TC-ROLE-08: Cannot delete role assigned to active user (OD-RBAC-003) → 422
 *   TC-ROLE-09: Cannot delete system role (OD-RBAC-002) → 403
 *   TC-ROLE-10: Admin can set permissions on custom role → 200
 *   TC-ROLE-11: Admin can set permissions on system role (OD-RBAC-002: perms ARE editable) → 200
 *   TC-ROLE-12: Invalid permissionId in setPermissions → 400
 *   TC-ROLE-13: GET /api/v1/roles/permissions returns all permissions → 200
 *   TC-ROLE-14: No-permission user cannot create role → 403
 *
 * Requires:
 *   - Local MySQL DB `koshk_skate` with seed data applied
 *   - `apps/api/.env` with valid credentials
 *
 * IMPORTANT: Tests use the real DB. They do NOT mock the DB or JWT.
 * Each test cleans up its own data in afterAll.
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'

import app from '../app.js'
import { db } from '../db/connection.js'
import { users, roles, userRoles, rolePermissions, refreshTokens } from '../db/schema/index.js'

const request = supertest(app)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

// Test-specific names — unlikely to clash with seed data
const TEST_ROLE_NAME    = 'test_custom_role_rbac'
const TEST_ROLE_NAME_AR = 'دور مخصص تجريبي'
const TEST_USER_EMAIL   = 'test.rbac.user@koshkskate.com'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAdmin(): Promise<{ accessToken: string }> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  return { accessToken: res.body.data.accessToken as string }
}

async function createTestRole(token: string, name = TEST_ROLE_NAME, nameAr = TEST_ROLE_NAME_AR) {
  return request
    .post('/api/v1/roles')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, nameAr })
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let createdRoleIds: number[] = []
let createdUserIds: number[] = []

beforeAll(async () => {
  // Remove any leftover data from previous test runs
  const existingRole = await db.select().from(roles).where(eq(roles.name, TEST_ROLE_NAME)).limit(1)
  if (existingRole.length) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, existingRole[0].id))
    await db.delete(userRoles).where(eq(userRoles.roleId, existingRole[0].id))
    await db.delete(roles).where(eq(roles.id, existingRole[0].id))
  }

  const existingUser = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
  if (existingUser.length) {
    await db.delete(userRoles).where(eq(userRoles.userId, existingUser[0].id))
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, existingUser[0].id))
    await db.delete(users).where(eq(users.id, existingUser[0].id))
  }
})

afterAll(async () => {
  // Clean up all roles created during tests
  for (const roleId of createdRoleIds) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId)).catch(() => {})
    await db.delete(userRoles).where(eq(userRoles.roleId, roleId)).catch(() => {})
    await db.delete(roles).where(eq(roles.id, roleId)).catch(() => {})
  }
  // Clean up test users
  for (const userId of createdUserIds) {
    await db.delete(userRoles).where(eq(userRoles.userId, userId)).catch(() => {})
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)).catch(() => {})
    await db.delete(users).where(eq(users.id, userId)).catch(() => {})
  }
})

// ---------------------------------------------------------------------------
// TC-ROLE-01: Admin can create a custom role
// ---------------------------------------------------------------------------

describe('TC-ROLE-01: Create custom role', () => {
  it('returns 201 and the created role', async () => {
    const { accessToken } = await loginAdmin()

    const res = await createTestRole(accessToken)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe(TEST_ROLE_NAME)
    expect(res.body.data.nameAr).toBe(TEST_ROLE_NAME_AR)
    expect(res.body.data.isSystem).toBe(false)
    expect(Array.isArray(res.body.data.permissions)).toBe(true)

    // Track for cleanup
    if (res.body.data.id) createdRoleIds.push(res.body.data.id)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-02: Duplicate role name → 409
// ---------------------------------------------------------------------------

describe('TC-ROLE-02: Duplicate role name rejected', () => {
  it('returns 409 when role name already exists', async () => {
    const { accessToken } = await loginAdmin()

    const res = await createTestRole(accessToken)

    expect(res.status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-03: Missing role name → 400
// ---------------------------------------------------------------------------

describe('TC-ROLE-03: Missing role name rejected', () => {
  it('returns 400 when name is empty', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '', nameAr: 'اسم' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when nameAr is missing', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'unique_test_name_no_ar' })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-04: Admin can update custom role name
// ---------------------------------------------------------------------------

describe('TC-ROLE-04: Update custom role name', () => {
  it('returns 200 with updated name', async () => {
    const { accessToken } = await loginAdmin()

    // Find the test role
    const roleRows = await db.select().from(roles).where(eq(roles.name, TEST_ROLE_NAME)).limit(1)
    expect(roleRows.length).toBe(1)
    const roleId = roleRows[0].id

    const res = await request
      .patch(`/api/v1/roles/${roleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nameAr: 'دور مخصص تجريبي محدّث' })

    expect(res.status).toBe(200)
    expect(res.body.data.nameAr).toBe('دور مخصص تجريبي محدّث')
    expect(res.body.data.name).toBe(TEST_ROLE_NAME) // English unchanged
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-05: Cannot rename system role (OD-RBAC-002)
// ---------------------------------------------------------------------------

describe('TC-ROLE-05: System role name is immutable (OD-RBAC-002)', () => {
  it('returns 403 when attempting to rename Administrator', async () => {
    const { accessToken } = await loginAdmin()

    // Find system role
    const systemRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.isSystem, true), eq(roles.name, 'Administrator')))
      .limit(1)
    expect(systemRole.length).toBe(1)

    const res = await request
      .patch(`/api/v1/roles/${systemRole[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Superadmin' })

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-06: Duplicate name on update → 409
// ---------------------------------------------------------------------------

describe('TC-ROLE-06: Duplicate name on update rejected', () => {
  it('returns 409 when updating role name to existing name', async () => {
    const { accessToken } = await loginAdmin()

    const roleRows = await db.select().from(roles).where(eq(roles.name, TEST_ROLE_NAME)).limit(1)
    expect(roleRows.length).toBe(1)
    const roleId = roleRows[0].id

    // Try to rename to an existing system role name
    const res = await request
      .patch(`/api/v1/roles/${roleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Administrator' }) // already exists

    expect(res.status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-07: Admin can delete custom role with no active users
// (Deferred to after TC-ROLE-08 sets up + tears down the user)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TC-ROLE-08: Cannot delete role assigned to active user (OD-RBAC-003)
// ---------------------------------------------------------------------------

describe('TC-ROLE-08: Cannot delete role assigned to active user (OD-RBAC-003)', () => {
  it('returns 422 with ROLE_HAS_ACTIVE_USERS code', async () => {
    const { accessToken } = await loginAdmin()

    // Find the test role
    const roleRows = await db.select().from(roles).where(eq(roles.name, TEST_ROLE_NAME)).limit(1)
    expect(roleRows.length).toBe(1)
    const roleId = roleRows[0].id

    // Create an active test user and assign the test role
    const [result] = await db.insert(users).values({
      name: 'مستخدم تجريبي للاختبار',
      email: TEST_USER_EMAIL,
      passwordHash: await bcrypt.hash('TestPass@99', 12),
      isActive: true,
    })
    const testUserId = result.insertId
    createdUserIds.push(testUserId)

    await db.insert(userRoles).values({ userId: testUserId, roleId })

    try {
      // Attempt delete — should be blocked
      const res = await request
        .delete(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      // Error handler returns { success: false, error: { code, message } }
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('ROLE_HAS_ACTIVE_USERS')

      // Verify role still exists
      const stillExists = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
      expect(stillExists.length).toBe(1)
    } finally {
      // Always clean up user assignment so TC-ROLE-07 can delete the role
      await db.delete(userRoles).where(and(eq(userRoles.userId, testUserId), eq(userRoles.roleId, roleId))).catch(() => {})
    }
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-07: Admin can delete custom role with no active users
// (Runs after TC-ROLE-08 has removed the user assignment)
// ---------------------------------------------------------------------------

describe('TC-ROLE-07: Delete custom role with no active users', () => {
  it('returns 200 and the role is removed', async () => {
    const { accessToken } = await loginAdmin()

    const roleRows = await db.select().from(roles).where(eq(roles.name, TEST_ROLE_NAME)).limit(1)
    expect(roleRows.length).toBe(1)
    const roleId = roleRows[0].id

    const res = await request
      .delete(`/api/v1/roles/${roleId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Verify role is gone from DB
    const gone = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
    expect(gone.length).toBe(0)

    // Remove from cleanup list (already deleted)
    createdRoleIds = createdRoleIds.filter(id => id !== roleId)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-09: Cannot delete system role (OD-RBAC-002)
// ---------------------------------------------------------------------------

describe('TC-ROLE-09: Cannot delete system role (OD-RBAC-002)', () => {
  it('returns 403 when attempting to delete Administrator', async () => {
    const { accessToken } = await loginAdmin()

    const systemRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.isSystem, true), eq(roles.name, 'Administrator')))
      .limit(1)
    expect(systemRole.length).toBe(1)

    const res = await request
      .delete(`/api/v1/roles/${systemRole[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(403)

    // Verify system role still exists
    const stillExists = await db.select().from(roles).where(eq(roles.id, systemRole[0].id)).limit(1)
    expect(stillExists.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-10: Admin can set permissions on custom role
// ---------------------------------------------------------------------------

describe('TC-ROLE-10: Set permissions on custom role', () => {
  let testRoleId: number

  beforeAll(async () => {
    // Create a fresh custom role for permission tests
    const { accessToken } = await loginAdmin()
    const res = await createTestRole(accessToken, 'test_perm_role', 'دور تجريبي للصلاحيات')
    testRoleId = res.body.data.id
    createdRoleIds.push(testRoleId)
  })

  it('returns 200 and updates permission set', async () => {
    const { accessToken } = await loginAdmin()

    // Get first 2 real permission IDs from DB
    const permRows = await db.select({ id: roles.id }).from(roles).limit(1) // just for syntax
    const allPerms = await db.select().from(
      // We need to import permissions — use the roles/permissions route
      (await import('../db/schema/index.js')).permissions
    )
    expect(allPerms.length).toBeGreaterThan(0)

    const firstPermId = allPerms[0].id
    const secondPermId = allPerms[1]?.id

    const permIds = secondPermId ? [firstPermId, secondPermId] : [firstPermId]

    const res = await request
      .put(`/api/v1/roles/${testRoleId}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permissionIds: permIds })

    expect(res.status).toBe(200)
    expect(res.body.data.permissions.length).toBe(permIds.length)
    expect(res.body.data.permissions.map((p: { id: number }) => p.id)).toEqual(expect.arrayContaining(permIds))
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-11: Admin can set permissions on system role (OD-RBAC-002)
// ---------------------------------------------------------------------------

describe('TC-ROLE-11: Set permissions on system role is allowed (OD-RBAC-002)', () => {
  it('returns 200 — system role permissions are editable', async () => {
    const { accessToken } = await loginAdmin()

    const cashierRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.isSystem, true), eq(roles.name, 'Cashier')))
      .limit(1)
    expect(cashierRole.length).toBe(1)

    // Get current permissions
    const currentPermsRes = await request
      .get(`/api/v1/roles/${cashierRole[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
    const currentPermIds = currentPermsRes.body.data.permissions.map((p: { id: number }) => p.id) as number[]

    // Set the same permissions back (safe — no change to actual data)
    const res = await request
      .put(`/api/v1/roles/${cashierRole[0].id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permissionIds: currentPermIds })

    expect(res.status).toBe(200)
    expect(res.body.data.permissions.length).toBe(currentPermIds.length)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-12: Invalid permissionId rejected → 400
// ---------------------------------------------------------------------------

describe('TC-ROLE-12: Invalid permissionId rejected', () => {
  it('returns 400 when permissionIds contains a non-existent ID', async () => {
    const { accessToken } = await loginAdmin()

    const customRole = await db.select().from(roles).where(eq(roles.isSystem, false)).limit(1)
    expect(customRole.length).toBeGreaterThan(0)

    const res = await request
      .put(`/api/v1/roles/${customRole[0].id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permissionIds: [999999] }) // non-existent permission ID

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-13: GET /api/v1/roles/permissions returns all permissions
// ---------------------------------------------------------------------------

describe('TC-ROLE-13: GET /api/v1/roles/permissions', () => {
  it('returns 200 with the full permission catalog', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .get('/api/v1/roles/permissions')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    // Seed data has 40 permissions
    expect(res.body.data.length).toBeGreaterThanOrEqual(40)
    // Each permission has expected fields
    const firstPerm = res.body.data[0]
    expect(firstPerm).toHaveProperty('id')
    expect(firstPerm).toHaveProperty('key')
    expect(firstPerm).toHaveProperty('labelAr')
    expect(firstPerm).toHaveProperty('module')
  })
})

// ---------------------------------------------------------------------------
// TC-ROLE-14: No-permission user cannot create role → 403
// ---------------------------------------------------------------------------

describe('TC-ROLE-14: Unauthorized role creation rejected', () => {
  it('returns 403 when user lacks roles.create permission', async () => {
    // Create a user with no roles (= no permissions)
    const nopermEmail = 'test.noperm.roles@koshkskate.com'
    const nopermPass  = 'NoPermPass@99'

    // Clean up if exists
    const existing = await db.select().from(users).where(eq(users.email, nopermEmail)).limit(1)
    if (existing.length) {
      await db.delete(userRoles).where(eq(userRoles.userId, existing[0].id))
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, existing[0].id))
      await db.delete(users).where(eq(users.id, existing[0].id))
    }

    const [result] = await db.insert(users).values({
      name: 'بدون صلاحيات',
      email: nopermEmail,
      passwordHash: await bcrypt.hash(nopermPass, 12),
      isActive: true,
    })
    const nopermUserId = result.insertId
    createdUserIds.push(nopermUserId)

    // Login
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: nopermEmail, password: nopermPass })
    expect(loginRes.status).toBe(200)
    const nopermToken = loginRes.body.data.accessToken as string

    // Attempt to create a role
    const res = await request
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ name: 'unauthorized_role', nameAr: 'دور غير مصرح' })

    expect(res.status).toBe(403)
  })
})
