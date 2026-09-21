/**
 * KOSHK SKATE ERP — Customers Routes
 * Phase 04 — Customers Module
 *
 * IMPORTANT: GET /search MUST be registered before GET /:id to prevent
 * "search" being matched as an :id parameter value.
 * Same rule applies to /activate and /deactivate sub-paths if ever added as GET.
 *
 * GET    /api/v1/customers                — list customers (paginated, searchable)  customers.view
 * POST   /api/v1/customers                — create customer                          customers.create
 * GET    /api/v1/customers/:id            — get customer profile (full national_id)  customers.view
 * PUT    /api/v1/customers/:id            — update customer                          customers.edit
 * POST   /api/v1/customers/:id/deactivate — soft-deactivate customer                customers.deactivate
 * POST   /api/v1/customers/:id/activate   — reactivate customer                     customers.deactivate
 * GET    /api/v1/customers/:id/rentals    — customer rental history (paginated)      customers.view (DEC-055)
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as customerSvc from './customers.service.js'
import type { ListCustomersQuery } from './customers.types.js'
// DEC-055: Customer rental history endpoint — Phase 05
import * as rentalSvc from '../rentals/rentals.service.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/customers — list customers
// ---------------------------------------------------------------------------

router.get(
  '/',
  authenticate,
  requirePermission('customers.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await customerSvc.listCustomers(req.query as ListCustomersQuery)
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/customers — create customer
// ---------------------------------------------------------------------------

router.post(
  '/',
  authenticate,
  requirePermission('customers.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await customerSvc.createCustomer(req.body)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/customers/:id/deactivate — soft-deactivate (DEC-052)
// MUST be before /:id to avoid conflict
// ---------------------------------------------------------------------------

router.post(
  '/:id/deactivate',
  authenticate,
  requirePermission('customers.deactivate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await customerSvc.deactivateCustomer(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/customers/:id/activate — reactivate (DEC-052)
// Same permission as deactivate — both are lifecycle operations
// ---------------------------------------------------------------------------

router.post(
  '/:id/activate',
  authenticate,
  requirePermission('customers.deactivate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await customerSvc.activateCustomer(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/customers/:id/rentals — customer rental history (DEC-055)
// Phase 05: Implemented. Must be registered BEFORE GET /:id.
// ---------------------------------------------------------------------------

router.get(
  '/:id/rentals',
  authenticate,
  requirePermission('customers.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await rentalSvc.getCustomerRentals(
        parseInt(String(req.params['id']), 10),
        req.query as { page?: string; perPage?: string },
      )
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/customers/:id — get customer profile (full national_id)
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  requirePermission('customers.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await customerSvc.getCustomer(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// PUT /api/v1/customers/:id — update customer
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  authenticate,
  requirePermission('customers.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await customerSvc.updateCustomer(
        parseInt(String(req.params['id']), 10),
        req.body,
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
