import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as DamageService from './damage.service.js'
import {
  CreateDamageReportRequest,
  PayDamageChargeRequest,
  WaiveDamageChargeRequest,
} from './damage.types.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  requirePermission('damage.view'),
  async (req, res, next) => {
    try {
      const result = await DamageService.listDamageReports(req.query as any)
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/:id',
  requirePermission('damage.view'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id as string, 10)
      const report = await DamageService.getDamageReport(id)
      res.json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/',
  requirePermission('damage.create'),
  async (req, res, next) => {
    try {
      const report = await DamageService.createDamageReport(req.user!.sub, req.body as CreateDamageReportRequest)
      res.status(201).json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/:id/pay',
  requirePermission('damage.collect_charge'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id as string, 10)
      const report = await DamageService.collectCharge(id, req.user!.sub, req.body as PayDamageChargeRequest)
      res.json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/:id/waive',
  requirePermission('waivers.approve'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id as string, 10)
      const report = await DamageService.waiveCharge(id, req.user!.sub, req.body as WaiveDamageChargeRequest)
      res.json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  }
)

export { router as damageRouter }
