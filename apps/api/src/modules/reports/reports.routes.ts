import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import { DateRangeInput } from './reports.types.js'
import * as reportsService from './reports.service.js'
import { ValidationError } from '../../utils/errors.js'

function validateQuery(req: any): DateRangeInput {
  const { startDate, endDate, page = '1', limit = '50' } = req.query
  if (!startDate || !endDate) {
    throw new ValidationError('تاريخ البداية والنهاية مطلوبان')
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new ValidationError('يجب أن يكون التاريخ بصيغة YYYY-MM-DD')
  }
  return {
    startDate: String(startDate),
    endDate: String(endDate),
    page: parseInt(String(page), 10) || 1,
    limit: parseInt(String(limit), 10) || 50
  }
}

export const reportsRouter = Router()

// All reports require authentication and reports.view permission
reportsRouter.use(authenticate)
reportsRouter.use(requirePermission('reports.view'))

reportsRouter.get('/overview', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getOverviewReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/operating-financial', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getOperatingFinancialReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/revenue', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getRevenueReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/expenses', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getExpenseReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/rentals', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getRentalReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/late', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getLateReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/damages', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getDamageReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/maintenance', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getMaintenanceReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/customers', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getCustomerReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/cashiers', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getCashierReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})

reportsRouter.get('/skate-performance', async (req, res, next) => {
  try {
    const filters = validateQuery(req)
    const report = await reportsService.getSkatePerformanceReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
})
