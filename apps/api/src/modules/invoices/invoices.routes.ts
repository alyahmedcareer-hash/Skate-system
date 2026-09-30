import { Router } from 'express'
import { getRentalInvoice, getSaleInvoice } from './invoices.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

export const invoicesRouter = Router()

// All invoices require auth
invoicesRouter.use(authenticate)

/**
 * GET /api/v1/invoices/rental/:id
 * Fetches the assembled invoice data for a rental.
 */
invoicesRouter.get('/rental/:id', requirePermission('rentals.view'), async (req, res, next) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const rentalId = parseInt(idParam as string, 10)
    if (isNaN(rentalId)) {
      throw new ValidationError('Invalid rental ID')
    }

    const invoiceData = await getRentalInvoice(rentalId)
    if (!invoiceData) {
      throw new NotFoundError('Rental not found or missing invoice number')
    }

    res.json({ success: true, data: invoiceData })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/v1/invoices/sale/:id
 * Fetches the assembled invoice data for a sale.
 */
invoicesRouter.get('/sale/:id', requirePermission('sales.view'), async (req, res, next) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const saleId = parseInt(idParam as string, 10)
    if (isNaN(saleId)) {
      throw new ValidationError('Invalid sale ID')
    }

    const invoiceData = await getSaleInvoice(saleId)
    if (!invoiceData) {
      throw new NotFoundError('Sale not found or missing invoice number')
    }

    res.json({ success: true, data: invoiceData })
  } catch (err) {
    next(err)
  }
})
