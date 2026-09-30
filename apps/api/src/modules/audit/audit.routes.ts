import { Router } from 'express'
import { auditService } from './audit.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
const router = Router()

// All routes require authentication and audit.view permission
router.use(authenticate)
router.use(requirePermission('audit.view'))

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10)
    const limit = parseInt(req.query.limit as string || '50', 10)
    
    const result = await auditService.listLogs(page, limit)
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    })
  } catch (error) {
    next(error)
  }
})

export { router as auditRouter }
