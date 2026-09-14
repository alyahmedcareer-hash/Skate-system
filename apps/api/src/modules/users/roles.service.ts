/**
 * KOSHK SKATE ERP — Roles Service
 * Phase 02 — Authentication & Permissions
 * Phase 02 Remediation — RBAC Gap fixes (OD-RBAC-001 / OD-RBAC-002 / OD-RBAC-003)
 *
 * Handles role and permission management.
 * DEC-016: Roles are configurable by Administrator. System roles cannot be deleted.
 * DEC-045: Role Management UI is Phase 02 remediation.
 * DEC-046: System role names are immutable; permissions are editable; cannot delete.
 * DEC-047: Cannot delete a role assigned to any active user.
 */

import { eq, inArray, and, ne } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { roles, permissions, rolePermissions, users, userRoles } from '../../db/schema/index.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError, BusinessRuleError } from '../../utils/errors.js'
import type { CreateRoleRequest, UpdateRoleRequest, RoleDTO, PermissionDTO } from './users.types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getRoleWithPermissions(roleId: number): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  const role = roleRows[0]

  const permRows = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      labelAr: permissions.labelAr,
      module: permissions.module,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))

  return {
    id: role.id,
    name: role.name,
    nameAr: role.nameAr,
    isSystem: role.isSystem,
    permissions: permRows,
  }
}

// ---------------------------------------------------------------------------
// listRoles
// ---------------------------------------------------------------------------

export async function listRoles(): Promise<RoleDTO[]> {
  const roleRows = await db.select().from(roles)
  return Promise.all(roleRows.map(r => getRoleWithPermissions(r.id)))
}

// ---------------------------------------------------------------------------
// getRole
// ---------------------------------------------------------------------------

export async function getRole(id: number): Promise<RoleDTO> {
  return getRoleWithPermissions(id)
}

// ---------------------------------------------------------------------------
// createRole
// ---------------------------------------------------------------------------

export async function createRole(body: CreateRoleRequest): Promise<RoleDTO> {
  const { name, nameAr } = body

  if (!name?.trim()) throw new ValidationError('اسم الدور مطلوب')
  if (!nameAr?.trim()) throw new ValidationError('الاسم العربي للدور مطلوب')

  // Check English name uniqueness
  const existingByName = await db.select().from(roles).where(eq(roles.name, name.trim())).limit(1)
  if (existingByName.length) throw new ConflictError('اسم الدور مستخدم بالفعل')

  // Check Arabic name uniqueness (GAP-RBAC-014)
  const existingByNameAr = await db.select().from(roles).where(eq(roles.nameAr, nameAr.trim())).limit(1)
  if (existingByNameAr.length) throw new ConflictError('الاسم العربي للدور مستخدم بالفعل')

  const [result] = await db.insert(roles).values({
    name: name.trim(),
    nameAr: nameAr.trim(),
    isSystem: false,
  })

  return getRoleWithPermissions(result.insertId)
}

// ---------------------------------------------------------------------------
// updateRole
// ---------------------------------------------------------------------------

export async function updateRole(id: number, body: UpdateRoleRequest): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  const role = roleRows[0]

  // OD-RBAC-002: System role names are immutable
  if (role.isSystem && (body.name !== undefined || body.nameAr !== undefined)) {
    throw new ForbiddenError('لا يمكن تغيير اسم الأدوار الأساسية للنظام')
  }

  const updates: Partial<typeof roles.$inferInsert> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) throw new ValidationError('اسم الدور لا يمكن أن يكون فارغاً')

    // GAP-RBAC-010: Duplicate name check on update
    const nameTrimmed = body.name.trim()
    const conflictByName = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, nameTrimmed), ne(roles.id, id)))
      .limit(1)
    if (conflictByName.length) throw new ConflictError('اسم الدور مستخدم بالفعل')

    updates.name = nameTrimmed
  }

  if (body.nameAr !== undefined) {
    if (!body.nameAr.trim()) throw new ValidationError('الاسم العربي لا يمكن أن يكون فارغاً')

    // Arabic name uniqueness on update
    const namArTrimmed = body.nameAr.trim()
    const conflictByNameAr = await db
      .select()
      .from(roles)
      .where(and(eq(roles.nameAr, namArTrimmed), ne(roles.id, id)))
      .limit(1)
    if (conflictByNameAr.length) throw new ConflictError('الاسم العربي للدور مستخدم بالفعل')

    updates.nameAr = namArTrimmed
  }

  if (Object.keys(updates).length > 0) {
    await db.update(roles).set(updates).where(eq(roles.id, id))
  }

  return getRoleWithPermissions(id)
}

// ---------------------------------------------------------------------------
// deleteRole — system roles cannot be deleted (DEC-016 / OD-RBAC-002)
//              roles assigned to active users cannot be deleted (OD-RBAC-003)
// ---------------------------------------------------------------------------

export async function deleteRole(id: number): Promise<void> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  // OD-RBAC-002: System roles cannot be deleted
  if (roleRows[0].isSystem) {
    throw new ForbiddenError('لا يمكن حذف الأدوار الأساسية للنظام')
  }

  // OD-RBAC-003: Cannot delete a role assigned to any active user
  const activeUserAssignments = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(and(eq(userRoles.roleId, id), eq(users.isActive, true)))
    .limit(1)

  if (activeUserAssignments.length) {
    throw new BusinessRuleError(
      'لا يمكن حذف هذا الدور لأنه مُعيَّن لمستخدمين نشطين. يرجى إعادة تعيين أدوار المستخدمين أولاً.',
      'ROLE_HAS_ACTIVE_USERS',
    )
  }

  await db.delete(roles).where(eq(roles.id, id))
}

// ---------------------------------------------------------------------------
// setRolePermissions — replace all permissions for a role (PUT semantics)
// OD-RBAC-002: System role permissions ARE editable
// GAP-RBAC-007: Validate that all permissionIds exist in DB
// ---------------------------------------------------------------------------

export async function setRolePermissions(roleId: number, permissionIds: number[]): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  // GAP-RBAC-007: Validate permissionIds exist in DB
  if (permissionIds.length > 0) {
    const foundPerms = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds))

    if (foundPerms.length !== permissionIds.length) {
      throw new ValidationError('بعض الصلاحيات المحددة غير موجودة')
    }
  }

  // Delete existing permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))

  // Insert new set
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map(permId => ({ roleId, permissionId: permId }))
    )
  }

  return getRoleWithPermissions(roleId)
}

// ---------------------------------------------------------------------------
// listPermissions — all available permission keys
// ---------------------------------------------------------------------------

export async function listPermissions(): Promise<PermissionDTO[]> {
  return db.select().from(permissions)
}
