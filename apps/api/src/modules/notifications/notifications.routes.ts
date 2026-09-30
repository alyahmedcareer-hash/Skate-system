import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import { notificationsService } from './notifications.service.js'

export const notificationsRouter = Router()

notificationsRouter.get('/', authenticate, requirePermission('rentals.view'), async (req, res, next) => {
  try {
    const data = await notificationsService.getNotifications()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})
