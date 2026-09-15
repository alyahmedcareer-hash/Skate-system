/**
 * KOSHK SKATE ERP — Users Management Integration Tests
 * Users Remediation — User Activation + Admin Password Change
 *
 * Tests:
 *   TC-USR-ACT-01: Deactivated user can be activated via POST /users/:id/activate
 *   TC-USR-ACT-02: Activation preserves user roles
 *   TC-USR-ACT-03: Activation preserves user identity (name, email)
 *   TC-USR-ACT-04: Activating already-active user succeeds (idempotent)
 *   TC-USR-ACT-05: Unauthorized activation rejected (403)
 *   TC-USR-ACT-06: Active user can be deactivated (regression — existing DELETE endpoint)
 *
 *   TC-USR-PWD-01: Administrator can change another user's password
 *   TC-USR-PWD-02: New password is correctly hashed (old hash fails, new hash works)
 *   TC-USR-PWD-03: Password never returned in API response
 *   TC-USR-PWD-04: User without users.change_password permission is rejected (403)
 *   TC-USR-PWD-05: Short password rejected (400)
 *   TC-USR-PWD-06: Mismatched passwords rejected (400)
 *   TC-USR-PWD-07: Empty password rejected (400)
 *   TC-USR-PWD-08: Password change on inactive user succeeds
 *   TC-USR-PWD-09: Password change does NOT activate inactive user
 *
 *   TC-USR-RBAC-01: users.change_password permission exists in DB
 *   TC-USR-RBAC-02: Administrator role has users.change_password
 *   TC-USR-RBAC-03: Cashier role does NOT have users.change_password
 *   TC-USR-RBAC-04: MaintenanceStaff role does NOT have users.change_password
 *
 * Requires:
 *   - Local MySQL DB `koshk_skate` with seed data applied (including users.change_password)
 *   - `apps/api/.env` with valid credentials
 *
 * IMPORTANT: Tests use the real DB. They do NOT mock the DB or JWT.
 * Each test set cleans up its own data in afterAll.
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'

import app from '../app.js'
import { db } from '../db/connection.js'
import { users, roles, permissions, userRoles, rolePermissions, refreshTokens } from '../db/schema/index.js'

const request = supertest(app)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

// Test user email addresses — unique to avoid clashing with other test files
const TEST_USER_EMAIL         = 'test.users.remediation@koshkskate.com'
const TEST_USER_INACTIVE      = 'test.users.inactive@koshkskate.com'
const TEST_USER_NOPERM        = 'test.users.noperm.chgpwd@koshkskate.com'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAdmin(): Promise<{ accessToken: string }> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  expect(res.status).toBe(200)
  return { accessToken: res.body.data.accessToken as string }
}

async function createTestUser(email: string, isActive: boolean, opts?: { passwordHash?: string }) {
  const [result] = await db.insert(users).values({
    name: 'مستخدم اختبار',
    email,
    passwordHash: opts?.passwordHash ?? await bcrypt.hash('TestPass@99', 12),
    isActive,
  })
  return result.insertId
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

// Track all created user IDs for cleanup
let createdUserIds: number[] = []

beforeAll(async () => {
  // Clean up any leftover test data from previous runs
  const emails = [TEST_USER_EMAIL, TEST_USER_INACTIVE, TEST_USER_NOPERM]
  for (const email of emails) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length) {
      await db.delete(userRoles).where(eq(userRoles.userId, existing[0].id)).catch(() => {})
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, existing[0].id)).catch(() => {})
      await db.delete(users).where(eq(users.id, existing[0].id)).catch(() => {})
    }
  }
})

afterAll(async () => {
  for (const userId of createdUserIds) {
    await db.delete(userRoles).where(eq(userRoles.userId, userId)).catch(() => {})
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)).catch(() => {})
    await db.delete(users).where(eq(users.id, userId)).catch(() => {})
  }
})

// ===========================================================================
// USER ACTIVATION TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// TC-USR-ACT-06: Active user can be deactivated (regression — existing DELETE)
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-06: Active user can be deactivated (regression)', () => {
  let testUserId: number

  beforeAll(async () => {
    testUserId = await createTestUser(TEST_USER_EMAIL, true)
    createdUserIds.push(testUserId)
  })

  it('DELETE /api/v1/users/:id returns 200 and sets isActive=false', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .delete(`/api/v1/users/${testUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Verify in DB
    const row = await db.select().from(users).where(eq(users.id, testUserId)).limit(1)
    expect(row[0].isActive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-ACT-01: Deactivated user can be activated
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-01: Deactivated user can be activated', () => {
  it('POST /api/v1/users/:id/activate returns 200 and sets isActive=true', async () => {
    const { accessToken } = await loginAdmin()

    // Find the user deactivated in TC-USR-ACT-06
    const userRow = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
    expect(userRow.length).toBe(1)
    expect(userRow[0].isActive).toBe(false)

    const res = await request
      .post(`/api/v1/users/${userRow[0].id}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Verify in DB
    const updated = await db.select().from(users).where(eq(users.id, userRow[0].id)).limit(1)
    expect(updated[0].isActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-ACT-02: Activation preserves user roles
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-02: Activation preserves user roles', () => {
  let testUserWithRoleId: number
  let assignedRoleId: number

  beforeAll(async () => {
    // Get a role to assign
    const adminRole = await db.select().from(roles).where(eq(roles.name, 'Administrator')).limit(1)
    expect(adminRole.length).toBe(1)
    assignedRoleId = adminRole[0].id

    // Create inactive user with a role
    const [result] = await db.insert(users).values({
      name: 'مستخدم بدور',
      email: 'test.act.roles@koshkskate.com',
      passwordHash: await bcrypt.hash('TestPass@99', 12),
      isActive: false,
    })
    testUserWithRoleId = result.insertId
    createdUserIds.push(testUserWithRoleId)

    // Assign the role
    await db.insert(userRoles).values({ userId: testUserWithRoleId, roleId: assignedRoleId })
  })

  it('activation does not remove or change role assignments', async () => {
    const { accessToken } = await loginAdmin()

    // Verify role is assigned before activation
    const rolesBefore = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, testUserWithRoleId))
    expect(rolesBefore.length).toBe(1)
    expect(rolesBefore[0].roleId).toBe(assignedRoleId)

    // Activate
    const res = await request
      .post(`/api/v1/users/${testUserWithRoleId}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)

    // Verify roles unchanged
    const rolesAfter = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, testUserWithRoleId))
    expect(rolesAfter.length).toBe(1)
    expect(rolesAfter[0].roleId).toBe(assignedRoleId)
  })

  afterAll(async () => {
    await db.delete(userRoles).where(eq(userRoles.userId, testUserWithRoleId)).catch(() => {})
    await db.delete(users).where(eq(users.id, testUserWithRoleId)).catch(() => {})
    createdUserIds = createdUserIds.filter(id => id !== testUserWithRoleId)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-ACT-03: Activation preserves user identity
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-03: Activation preserves user identity (name, email)', () => {
  it('name and email are unchanged after activation', async () => {
    const { accessToken } = await loginAdmin()

    // Use the test user email (activated in TC-USR-ACT-01)
    const userRow = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
    expect(userRow.length).toBe(1)

    const originalName  = userRow[0].name
    const originalEmail = userRow[0].email

    // Deactivate then reactivate
    await request
      .delete(`/api/v1/users/${userRow[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)

    await request
      .post(`/api/v1/users/${userRow[0].id}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)

    // Verify identity unchanged
    const afterRow = await db.select().from(users).where(eq(users.id, userRow[0].id)).limit(1)
    expect(afterRow[0].name).toBe(originalName)
    expect(afterRow[0].email).toBe(originalEmail)
    expect(afterRow[0].isActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-ACT-04: Activating already-active user succeeds (idempotent)
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-04: Activating already-active user is idempotent', () => {
  it('returns 200 when user is already active', async () => {
    const { accessToken } = await loginAdmin()

    // Use the test user (currently active)
    const userRow = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
    expect(userRow[0].isActive).toBe(true)

    const res = await request
      .post(`/api/v1/users/${userRow[0].id}/activate`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-ACT-05: Unauthorized activation rejected (403)
// ---------------------------------------------------------------------------

describe('TC-USR-ACT-05: Unauthorized activation rejected', () => {
  it('returns 403 when user lacks users.delete permission', async () => {
    // Create a no-permission user
    const nopermEmail = 'test.act.noperm@koshkskate.com'
    const nopermPass  = 'NoPermPass@99'

    const existing = await db.select().from(users).where(eq(users.email, nopermEmail)).limit(1)
    if (!existing.length) {
      const [result] = await db.insert(users).values({
        name: 'بدون صلاحية',
        email: nopermEmail,
        passwordHash: await bcrypt.hash(nopermPass, 12),
        isActive: true,
      })
      createdUserIds.push(result.insertId)
    }

    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: nopermEmail, password: nopermPass })
    expect(loginRes.status).toBe(200)
    const nopermToken = loginRes.body.data.accessToken as string

    // Find the test target user
    const targetRow = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
    expect(targetRow.length).toBe(1)

    const res = await request
      .post(`/api/v1/users/${targetRow[0].id}/activate`)
      .set('Authorization', `Bearer ${nopermToken}`)

    expect(res.status).toBe(403)

    // Clean up no-perm user
    const nopermRow = await db.select().from(users).where(eq(users.email, nopermEmail)).limit(1)
    if (nopermRow.length) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, nopermRow[0].id)).catch(() => {})
      await db.delete(users).where(eq(users.id, nopermRow[0].id)).catch(() => {})
      createdUserIds = createdUserIds.filter(id => id !== nopermRow[0].id)
    }
  })
})

// ===========================================================================
// PASSWORD CHANGE TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// TC-USR-PWD-01: Administrator can change another user's password
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-01: Administrator can change another user\'s password', () => {
  let targetUserId: number
  const initialPassword = 'Initial@99'
  const newPassword     = 'NewPass@77'

  beforeAll(async () => {
    targetUserId = await createTestUser(TEST_USER_NOPERM, true, {
      passwordHash: await bcrypt.hash(initialPassword, 12),
    })
    createdUserIds.push(targetUserId)
  })

  it('POST /api/v1/users/:id/change-password returns 200', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .post(`/api/v1/users/${targetUserId}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword, confirmPassword: newPassword })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  // TC-USR-PWD-02: New password is correctly hashed
  it('TC-USR-PWD-02: new password hash works; old hash is invalidated', async () => {
    const userRow = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1)
    expect(userRow.length).toBe(1)

    // Old password should no longer match
    const oldMatch = await bcrypt.compare(initialPassword, userRow[0].passwordHash)
    expect(oldMatch).toBe(false)

    // New password should match
    const newMatch = await bcrypt.compare(newPassword, userRow[0].passwordHash)
    expect(newMatch).toBe(true)
  })

  // TC-USR-PWD-03: Password never returned in API response
  it('TC-USR-PWD-03: response contains no password field', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .post(`/api/v1/users/${targetUserId}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: 'AnotherPass@1', confirmPassword: 'AnotherPass@1' })

    const body = JSON.stringify(res.body)
    expect(body).not.toContain('password')
    expect(body).not.toContain('passwordHash')
    expect(body).not.toContain('AnotherPass@1')
  })
})

// ---------------------------------------------------------------------------
// TC-USR-PWD-04: User without users.change_password is rejected (403)
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-04: User without users.change_password permission is rejected', () => {
  it('returns 403', async () => {
    // Create a user with no permissions
    const nopermEmail = 'test.pwd.noperm.user@koshkskate.com'
    const nopermPass  = 'NoPermPass@12'

    const existing = await db.select().from(users).where(eq(users.email, nopermEmail)).limit(1)
    let nopermUserId: number
    if (!existing.length) {
      const [result] = await db.insert(users).values({
        name: 'بدون صلاحية تغيير المرور',
        email: nopermEmail,
        passwordHash: await bcrypt.hash(nopermPass, 12),
        isActive: true,
      })
      nopermUserId = result.insertId
      createdUserIds.push(nopermUserId)
    } else {
      nopermUserId = existing[0].id
    }

    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: nopermEmail, password: nopermPass })
    expect(loginRes.status).toBe(200)
    const nopermToken = loginRes.body.data.accessToken as string

    // Find any target user to attempt changing password on
    const targetRow = await db.select().from(users).where(eq(users.email, TEST_USER_NOPERM)).limit(1)
    expect(targetRow.length).toBe(1)

    const res = await request
      .post(`/api/v1/users/${targetRow[0].id}/change-password`)
      .set('Authorization', `Bearer ${nopermToken}`)
      .send({ newPassword: 'Hacking@99', confirmPassword: 'Hacking@99' })

    expect(res.status).toBe(403)

    // Clean up
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, nopermUserId)).catch(() => {})
    await db.delete(users).where(eq(users.id, nopermUserId)).catch(() => {})
    createdUserIds = createdUserIds.filter(id => id !== nopermUserId)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-PWD-05: Short password rejected (400)
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-05: Short password rejected', () => {
  it('returns 400 when newPassword is less than 6 characters', async () => {
    const { accessToken } = await loginAdmin()

    const targetRow = await db.select().from(users).where(eq(users.email, TEST_USER_NOPERM)).limit(1)
    expect(targetRow.length).toBe(1)

    const res = await request
      .post(`/api/v1/users/${targetRow[0].id}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: '123', confirmPassword: '123' })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-PWD-06: Mismatched passwords rejected (400)
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-06: Mismatched passwords rejected', () => {
  it('returns 400 when newPassword and confirmPassword do not match', async () => {
    const { accessToken } = await loginAdmin()

    const targetRow = await db.select().from(users).where(eq(users.email, TEST_USER_NOPERM)).limit(1)
    expect(targetRow.length).toBe(1)

    const res = await request
      .post(`/api/v1/users/${targetRow[0].id}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: 'GoodPass@1', confirmPassword: 'DifferentPass@2' })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-PWD-07: Empty password rejected (400)
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-07: Empty password rejected', () => {
  it('returns 400 when newPassword is empty', async () => {
    const { accessToken } = await loginAdmin()

    const targetRow = await db.select().from(users).where(eq(users.email, TEST_USER_NOPERM)).limit(1)
    expect(targetRow.length).toBe(1)

    const res = await request
      .post(`/api/v1/users/${targetRow[0].id}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: '', confirmPassword: '' })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-PWD-08: Password change on inactive user succeeds
// ---------------------------------------------------------------------------

describe('TC-USR-PWD-08: Password change on inactive user succeeds', () => {
  let inactiveUserId: number

  beforeAll(async () => {
    inactiveUserId = await createTestUser(TEST_USER_INACTIVE, false)
    createdUserIds.push(inactiveUserId)
  })

  it('returns 200 when changing password of an inactive user', async () => {
    const { accessToken } = await loginAdmin()

    // Verify user is inactive before test
    const before = await db.select().from(users).where(eq(users.id, inactiveUserId)).limit(1)
    expect(before[0].isActive).toBe(false)

    const res = await request
      .post(`/api/v1/users/${inactiveUserId}/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: 'InactiveNewPwd@1', confirmPassword: 'InactiveNewPwd@1' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  // TC-USR-PWD-09: Password change does NOT activate inactive user
  it('TC-USR-PWD-09: user remains inactive after password change', async () => {
    const after = await db.select().from(users).where(eq(users.id, inactiveUserId)).limit(1)
    expect(after[0].isActive).toBe(false) // still inactive — DEC-050
  })
})

// ===========================================================================
// RBAC TESTS — new permission
// ===========================================================================

// ---------------------------------------------------------------------------
// TC-USR-RBAC-01: users.change_password permission exists in DB
// ---------------------------------------------------------------------------

describe('TC-USR-RBAC-01: users.change_password permission exists in DB', () => {
  it('permission key is seeded in the permissions table', async () => {
    const perm = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, 'users.change_password'))
      .limit(1)

    expect(perm.length).toBe(1)
    expect(perm[0].key).toBe('users.change_password')
    expect(perm[0].module).toBe('users')
    expect(perm[0].labelAr).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// TC-USR-RBAC-02: Administrator role has users.change_password
// ---------------------------------------------------------------------------

describe('TC-USR-RBAC-02: Administrator role has users.change_password', () => {
  it('Administrator role is assigned the users.change_password permission', async () => {
    const adminRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, 'Administrator'), eq(roles.isSystem, true)))
      .limit(1)
    expect(adminRole.length).toBe(1)

    const perm = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, 'users.change_password'))
      .limit(1)
    expect(perm.length).toBe(1)

    const assignment = await db
      .select()
      .from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, adminRole[0].id),
        eq(rolePermissions.permissionId, perm[0].id),
      ))
      .limit(1)

    expect(assignment.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// TC-USR-RBAC-03: Cashier role does NOT have users.change_password
// ---------------------------------------------------------------------------

describe('TC-USR-RBAC-03: Cashier role does NOT have users.change_password', () => {
  it('Cashier role is NOT assigned users.change_password by default', async () => {
    const cashierRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, 'Cashier'), eq(roles.isSystem, true)))
      .limit(1)
    expect(cashierRole.length).toBe(1)

    const perm = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, 'users.change_password'))
      .limit(1)
    expect(perm.length).toBe(1)

    const assignment = await db
      .select()
      .from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, cashierRole[0].id),
        eq(rolePermissions.permissionId, perm[0].id),
      ))
      .limit(1)

    expect(assignment.length).toBe(0) // Cashier should NOT have it
  })
})

// ---------------------------------------------------------------------------
// TC-USR-RBAC-04: MaintenanceStaff role does NOT have users.change_password
// ---------------------------------------------------------------------------

describe('TC-USR-RBAC-04: MaintenanceStaff role does NOT have users.change_password', () => {
  it('MaintenanceStaff role is NOT assigned users.change_password by default', async () => {
    const maintRole = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, 'MaintenanceStaff'), eq(roles.isSystem, true)))
      .limit(1)
    expect(maintRole.length).toBe(1)

    const perm = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, 'users.change_password'))
      .limit(1)
    expect(perm.length).toBe(1)

    const assignment = await db
      .select()
      .from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, maintRole[0].id),
        eq(rolePermissions.permissionId, perm[0].id),
      ))
      .limit(1)

    expect(assignment.length).toBe(0) // MaintenanceStaff should NOT have it
  })
})
