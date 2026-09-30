import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { loadUserWithPermissions } from '../auth/auth.service.js'
import * as dashboardService from './dashboard.service.js'
import { ValidationError } from '../../utils/errors.js'

function validateQuery(req: any) {
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) {
    throw new ValidationError('تاريخ البداية والنهاية مطلوبان')
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new ValidationError('يجب أن يكون التاريخ بصيغة YYYY-MM-DD')
  }
  let start = String(startDate)
  let end = String(endDate)
  if (new Date(start) > new Date(end)) {
    const temp = start
    start = end
    end = temp
  }
  return {
    startDate: start,
    endDate: end,
  }
}

export const dashboardRouter = Router()

// The dashboard requires authentication. Role-based filtering happens in the service.
dashboardRouter.use(authenticate)

dashboardRouter.get('/kpis', async (req: any, res, next) => {
  try {
    const filters = validateQuery(req)
    // Extract user permissions.
    const authUser = await loadUserWithPermissions(req.user.sub)
    const permissions = authUser.permissions
    const report = await dashboardService.getDashboardData(permissions, filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})
