import { Router } from 'express'
import { settingsService } from './settings.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'

export const settingsRouter = Router()

// All users need to read settings (for print toggle, hourly rate, etc)
settingsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// Only admins can update settings
settingsRouter.patch('/', authenticate, requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const updates = req.body
    await settingsService.update(updates, req.user!.sub)
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})
