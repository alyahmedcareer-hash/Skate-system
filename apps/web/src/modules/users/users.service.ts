/**
 * KOSHK SKATE ERP — Users Service (Frontend)
 * Phase 02 — Authentication & Permissions
 * Phase 02 Remediation — added listPermissions, rolesService.update (GAP-RBAC-019)
 * Users Remediation — added activate, changePassword (DEC-048/DEC-049)
 */

import api from '../../services/api'

export interface UserDTO {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: Array<{ id: number; name: string; nameAr: string }>
}

export interface RoleDTO {
  id: number
  name: string
  nameAr: string
  isSystem: boolean
  permissions: Array<{ id: number; key: string; labelAr: string; module: string }>
}

export interface PermissionDTO {
  id: number
  key: string
  labelAr: string
  module: string
}

// Users API
export const usersService = {
  list: () => api.get<{ success: boolean; data: UserDTO[] }>('/api/v1/users').then(r => r.data),
  get: (id: number) => api.get<{ success: boolean; data: UserDTO }>(`/api/v1/users/${id}`).then(r => r.data),
  create: (body: { name: string; email: string; password: string; roleIds: number[] }) =>
    api.post<{ success: boolean; data: UserDTO }>('/api/v1/users', body).then(r => r.data),
  update: (id: number, body: Partial<{ name: string; email: string; password: string; isActive: boolean; roleIds: number[] }>) =>
    api.patch<{ success: boolean; data: UserDTO }>(`/api/v1/users/${id}`, body).then(r => r.data),
  deactivate: (id: number) => api.delete<{ success: boolean }>(`/api/v1/users/${id}`),
  /** Restore a deactivated user to active status (DEC-048). Roles and history are preserved. */
  activate: (id: number) => api.post<{ success: boolean }>(`/api/v1/users/${id}/activate`),
  /** Change another user's password (DEC-049). Old password not required. Sessions not invalidated (DEC-050). */
  changePassword: (id: number, body: { newPassword: string; confirmPassword: string }) =>
    api.post<{ success: boolean }>(`/api/v1/users/${id}/change-password`, body),
}

// Roles API
export const rolesService = {
  list: () => api.get<{ success: boolean; data: RoleDTO[] }>('/api/v1/roles').then(r => r.data),
  get: (id: number) => api.get<{ success: boolean; data: RoleDTO }>(`/api/v1/roles/${id}`).then(r => r.data),
  create: (body: { name: string; nameAr: string }) =>
    api.post<{ success: boolean; data: RoleDTO }>('/api/v1/roles', body).then(r => r.data),
  // Route: GET /api/v1/roles/permissions (static path declared before /:id in roles.routes.ts)
  update: (id: number, body: { name?: string; nameAr?: string }) =>
    api.patch<{ success: boolean; data: RoleDTO }>(`/api/v1/roles/${id}`, body).then(r => r.data),
  setPermissions: (id: number, permissionIds: number[]) =>
    api.put<{ success: boolean; data: RoleDTO }>(`/api/v1/roles/${id}/permissions`, { permissionIds }).then(r => r.data),
  delete: (id: number) => api.delete<{ success: boolean }>(`/api/v1/roles/${id}`),
  listPermissions: () =>
    api.get<{ success: boolean; data: PermissionDTO[] }>('/api/v1/roles/permissions').then(r => r.data),
}
