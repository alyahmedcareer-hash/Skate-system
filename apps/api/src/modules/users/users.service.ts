/**
 * KOSHK SKATE ERP — Users Service
 * Phase 02 — Authentication & Permissions
 * Phase 02 Remediation — RBAC Gap fixes (GAP-RBAC-018)
 * Users Remediation — User activation + admin password change (DEC-048/DEC-049/DEC-050)
 *
 * Handles user CRUD operations.
 * Password is always bcrypt-hashed (min 12 rounds).
 * No hard delete: use is_active = false for deactivation (DEC-009 principle).
 *
 * GAP-RBAC-018: createUser() and updateUser() now validate that provided roleIds exist.
 * DEC-048: Deactivated users can be reactivated; roles and history are preserved.
 * DEC-049: users.change_password permission allows changing another user's password.
 * DEC-050: Changing a user's password does NOT invalidate existing sessions.
 */

import bcrypt from 'bcryptjs'
import { eq, ne, inArray } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { users, roles, userRoles } from '../../db/schema/index.js'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js'
import type { CreateUserRequest, UpdateUserRequest, UserDTO } from './users.types.js'

const BCRYPT_ROUNDS = 12

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserWithRoles(userId: number): Promise<UserDTO> {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows.length) throw new NotFoundError('المستخدم غير موجود')

  const user = userRows[0]

  const roleRows = await db
    .select({ id: roles.id, name: roles.name, nameAr: roles.nameAr })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    roles: roleRows,
  }
}

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<UserDTO[]> {
  const userRows = await db.select().from(users)

  const result: UserDTO[] = await Promise.all(
    userRows.map(u => getUserWithRoles(u.id))
  )
  return result
}

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

export async function getUser(id: number): Promise<UserDTO> {
  return getUserWithRoles(id)
}

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

export async function createUser(body: CreateUserRequest): Promise<UserDTO> {
  const { name, email, password, roleIds } = body

  if (!name?.trim()) throw new ValidationError('الاسم مطلوب')
  if (!email?.trim()) throw new ValidationError('البريد الإلكتروني مطلوب')
  if (!password || password.length < 6) throw new ValidationError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

  const normalizedEmail = email.toLowerCase().trim()

  // Check unique email
  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (existing.length) throw new ConflictError('البريد الإلكتروني مستخدم بالفعل')

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const [result] = await db.insert(users).values({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    isActive: true,
  })

  const newUserId = result.insertId

  // GAP-RBAC-018: Validate roleIds exist in DB before inserting
  if (roleIds?.length) {
    const foundRoles = await db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, roleIds))
    if (foundRoles.length !== roleIds.length) {
      throw new ValidationError('بعض الأدوار المحددة غير موجودة')
    }
    await db.insert(userRoles).values(roleIds.map(roleId => ({ userId: newUserId, roleId })))
  }

  return getUserWithRoles(newUserId)
}

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

export async function updateUser(id: number, body: UpdateUserRequest): Promise<UserDTO> {
  const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!userRows.length) throw new NotFoundError('المستخدم غير موجود')

  const updates: Partial<typeof users.$inferInsert> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) throw new ValidationError('الاسم لا يمكن أن يكون فارغاً')
    updates.name = body.name.trim()
  }

  if (body.email !== undefined) {
    const normalizedEmail = body.email.toLowerCase().trim()
    // Ensure no other user has this email
    const conflict = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)
    if (conflict.length && conflict[0].id !== id) {
      throw new ConflictError('البريد الإلكتروني مستخدم بالفعل')
    }
    updates.email = normalizedEmail
  }

  if (body.password !== undefined) {
    if (body.password.length < 6) throw new ValidationError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    updates.passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS)
  }

  if (body.isActive !== undefined) {
    updates.isActive = body.isActive
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id))
  }

  // Update roles if provided (GAP-RBAC-018: validate roleIds exist)
  if (body.roleIds !== undefined) {
    if (body.roleIds.length > 0) {
      const foundRoles = await db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.id, body.roleIds))
      if (foundRoles.length !== body.roleIds.length) {
        throw new ValidationError('بعض الأدوار المحددة غير موجودة')
      }
    }
    await db.delete(userRoles).where(eq(userRoles.userId, id))
    if (body.roleIds.length > 0) {
      await db.insert(userRoles).values(body.roleIds.map(roleId => ({ userId: id, roleId })))
    }
  }

  return getUserWithRoles(id)
}

// ---------------------------------------------------------------------------
// deleteUser (soft — set is_active = false)
// No hard delete: historical records must be retained (DEC-009)
// ---------------------------------------------------------------------------

export async function deactivateUser(id: number): Promise<void> {
  const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!userRows.length) throw new NotFoundError('المستخدم غير موجود')

  await db.update(users).set({ isActive: false }).where(eq(users.id, id))
}

// ---------------------------------------------------------------------------
// activateUser — restore a deactivated user to active status (DEC-048)
//
// Business rules:
// - User must exist
// - Roles, history, and all data are preserved (no changes made)
// - Only isActive changes: false → true
// - If user is already active, return gracefully (idempotent)
// ---------------------------------------------------------------------------

export async function activateUser(id: number): Promise<void> {
  const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!userRows.length) throw new NotFoundError('المستخدم غير موجود')

  // Idempotent: silently succeed if already active
  if (userRows[0].isActive) return

  await db.update(users).set({ isActive: true }).where(eq(users.id, id))
}

// ---------------------------------------------------------------------------
// changeUserPassword — admin/authorized change of another user's password (DEC-049)
//
// Business rules:
// - User must exist (active OR inactive — password can be changed on inactive users)
// - newPassword meets existing policy (min 6 chars)
// - newPassword === confirmPassword (caller must pass both; validated here)
// - Password is bcrypt-hashed using the same BCRYPT_ROUNDS constant
// - isActive is NOT modified — deactivated user remains deactivated (DEC-050)
// - Existing sessions remain active (DEC-050 — no session invalidation)
// - Password hash is never returned
// ---------------------------------------------------------------------------

export async function changeUserPassword(
  id: number,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  if (!newPassword) throw new ValidationError('كلمة المرور الجديدة مطلوبة')
  if (!confirmPassword) throw new ValidationError('تأكيد كلمة المرور مطلوب')
  if (newPassword !== confirmPassword) throw new ValidationError('كلمتا المرور غير متطابقتين')
  if (newPassword.length < 6) throw new ValidationError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

  const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!userRows.length) throw new NotFoundError('المستخدم غير موجود')

  // Hash with same mechanism as createUser/updateUser
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  // Update only the password hash — isActive and all other fields unchanged
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}
