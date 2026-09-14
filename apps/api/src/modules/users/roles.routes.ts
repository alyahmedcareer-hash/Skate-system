/**
 * KOSHK SKATE ERP — Roles Routes
 * Phase 02 — Authentication & Permissions
 * Phase 02 Remediation — RBAC Gap fixes (OD-RBAC-001 / OD-RBAC-002 / OD-RBAC-003)
 *
 * Mounted at /api/v1/roles in app.ts
 *
 * GET    /api/v1/roles                         — list roles          (roles.view)
 * POST   /api/v1/roles                         — create role         (roles.create)
 * GET    /api/v1/roles/permissions             — list all perms      (roles.view) [GAP-RBAC-004 FIXED]
 * GET    /api/v1/roles/:id                     — get role            (roles.view)
 * PATCH  /api/v1/roles/:id                     — update role         (roles.edit)
 * DELETE /api/v1/roles/:id                     — delete role         (roles.edit)
 * PUT    /api/v1/roles/:id/permissions         — set permissions     (roles.edit)
 *
 * IMPORTANT: Static paths (/permissions) must be declared BEFORE param paths (/:id)
 * to prevent Express matching "permissions" as an :id value.
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as rolesService from './roles.service.js'

const router = Router()

// GET /api/v1/roles
router.get(
  '/',
  authenticate,
  requirePermission('roles.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rolesService.listRoles()
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// POST /api/v1/roles
router.post(
  '/',
  authenticate,
  requirePermission('roles.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rolesService.createRole(req.body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// GET /api/v1/roles/permissions — list all permission keys
// MUST be declared before /:id to avoid Express matching "permissions" as an ID
router.get(
  '/permissions',
  authenticate,
  requirePermission('roles.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rolesService.listPermissions()
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// GET /api/v1/roles/:id
router.get(
  '/:id',
  authenticate,
  requirePermission('roles.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rolesService.getRole(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// PATCH /api/v1/roles/:id
router.patch(
  '/:id',
  authenticate,
  requirePermission('roles.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rolesService.updateRole(parseInt(String(req.params['id']), 10), req.body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// DELETE /api/v1/roles/:id
router.delete(
  '/:id',
  authenticate,
  requirePermission('roles.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await rolesService.deleteRole(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data: { message: 'تم حذف الدور' } })
    } catch (err) { next(err) }
  },
)

// PUT /api/v1/roles/:id/permissions
router.put(
  '/:id/permissions',
  authenticate,
  requirePermission('roles.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { permissionIds } = req.body
      const data = await rolesService.setRolePermissions(
        parseInt(String(req.params['id']), 10),
        permissionIds ?? [],
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

export default router
