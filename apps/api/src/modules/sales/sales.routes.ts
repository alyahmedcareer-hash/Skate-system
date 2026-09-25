import { Router } from 'express'
import { SalesService } from './sales.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'

export const salesRouter = Router()

salesRouter.get('/', authenticate, requirePermission('sales.view'), async (req, res, next) => {
  try {
    const sales = await SalesService.listSales()
    res.json({ success: true, data: sales })
  } catch (err: any) {
    next(err)
  }
})

salesRouter.post('/', authenticate, requirePermission('sales.create'), async (req, res, next) => {
  try {
    // Add cashierId from authenticated user
    const saleData = { ...req.body, cashierId: req.user!.sub }
    
    const sale = await SalesService.createSale(saleData)
    res.status(201).json({ success: true, data: sale })
  } catch (err: any) {
    next(err)
  }
})

salesRouter.get('/:id', authenticate, requirePermission('sales.view'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const sale = await SalesService.getSale(id)
    if (!sale) {
      return res.status(404).json({ success: false, error: { message: 'Sale not found' } })
    }
    res.json({ success: true, data: sale })
  } catch (err: any) {
    next(err)
  }
})

salesRouter.post('/:id/cancel', authenticate, requirePermission('sales.cancel'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const sale = await SalesService.cancelSale(id, req.user!.sub)
    res.json({ success: true, data: sale })
  } catch (err: any) {
    next(err)
  }
})
