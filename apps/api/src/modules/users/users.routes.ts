/**
 * KOSHK SKATE ERP — Users Routes
 * Phase 02 — Authentication & Permissions
 * Users Remediation — User activation + admin password change (DEC-048/DEC-049/DEC-050)
 *
 * All routes require authentication + specific permissions (server-side — Rule 13)
 *
 * GET    /api/v1/users                    — list all users         (users.view)
 * POST   /api/v1/users                    — create user            (users.create)
 * GET    /api/v1/users/:id                — get user by ID         (users.view)
 * PATCH  /api/v1/users/:id                — update user            (users.edit)
 * DELETE /api/v1/users/:id                — deactivate user        (users.delete)
 * POST   /api/v1/users/:id/activate       — activate user          (users.delete)
 * POST   /api/v1/users/:id/change-password — change password       (users.change_password)
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as usersService from './users.service.js'

const router = Router()

// GET /api/v1/users
router.get(
  '/',
  authenticate,
  requirePermission('users.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.listUsers()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/users
router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.createUser(req.body)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/users/:id
router.get(
  '/:id',
  authenticate,
  requirePermission('users.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.getUser(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/users/:id
router.patch(
  '/:id',
  authenticate,
  requirePermission('users.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.updateUser(parseInt(String(req.params['id']), 10), req.body)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/users/:id  — soft deactivation, no hard delete (DEC-009)
router.delete(
  '/:id',
  authenticate,
  requirePermission('users.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.deactivateUser(parseInt(String(req.params['id']), 10))
      res.status(200).json({ success: true, data: { message: 'تم تعطيل حساب المستخدم' } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/users/:id/activate — restore deactivated user to active status (DEC-048)
// Authorization: users.delete (user lifecycle management, consistent with deactivate)
router.post(
  '/:id/activate',
  authenticate,
  requirePermission('users.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.activateUser(parseInt(String(req.params['id']), 10))
      res.status(200).json({ success: true, data: { message: 'تم تفعيل حساب المستخدم' } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/users/:id/change-password — admin/authorized password change (DEC-049)
// Authorization: users.change_password (dedicated permission — not granted to all roles by default)
// Body: { newPassword: string, confirmPassword: string }
// Security:
//   - Old password is NOT required (administrative capability)
//   - Password is bcrypt-hashed server-side; never stored as plaintext
//   - Password is never returned in the response
//   - Existing sessions remain active (DEC-050 — no session invalidation)
//   - Works on inactive users; does NOT activate them
router.post(
  '/:id/change-password',
  authenticate,
  requirePermission('users.change_password'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newPassword, confirmPassword } = req.body as {
        newPassword?: string
        confirmPassword?: string
      }
      await usersService.changeUserPassword(
        parseInt(String(req.params['id']), 10),
        newPassword ?? '',
        confirmPassword ?? '',
      )
      res.status(200).json({ success: true, data: { message: 'تم تغيير كلمة المرور بنجاح' } })
    } catch (err) {
      next(err)
    }
  },
)

export default router
