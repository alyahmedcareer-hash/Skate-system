import { Router } from 'express'
import { ProductsService } from './products.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'

export const productsRouter = Router()

// ==========================================
// CATEGORIES
// ==========================================

productsRouter.get('/categories', authenticate, requirePermission('products.view'), async (req, res) => {
  try {
    const categories = await ProductsService.listCategories()
    res.json({ success: true, data: categories })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

productsRouter.post('/categories', authenticate, requirePermission('products.manage'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.nameAr) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } })
    }
    const category = await ProductsService.createCategory(req.body)
    res.status(201).json({ success: true, data: category })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

productsRouter.put('/categories/:id', authenticate, requirePermission('products.manage'), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const category = await ProductsService.updateCategory(id, req.body)
    if (!category) {
      return res.status(404).json({ success: false, error: { message: 'Category not found' } })
    }
    res.json({ success: true, data: category })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

// ==========================================
// PRODUCTS
// ==========================================

productsRouter.get('/', authenticate, requirePermission('products.view'), async (req, res) => {
  try {
    const products = await ProductsService.listProducts()
    res.json({ success: true, data: products })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

productsRouter.post('/', authenticate, requirePermission('products.manage'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.nameAr || !req.body.categoryId || req.body.price === undefined) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } })
    }
    const product = await ProductsService.createProduct(req.body)
    res.status(201).json({ success: true, data: product })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

productsRouter.put('/:id', authenticate, requirePermission('products.manage'), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const product = await ProductsService.updateProduct(id, req.body)
    if (!product) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } })
    }
    res.json({ success: true, data: product })
  } catch (err: any) {
    if (err.message === 'STOCK_CANNOT_BE_NEGATIVE') {
      return res.status(422).json({ success: false, error: { code: 'STOCK_CANNOT_BE_NEGATIVE', message: 'Stock cannot be negative' } })
    }
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})

productsRouter.get('/:id', authenticate, requirePermission('products.view'), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const product = await ProductsService.getProduct(id)
    if (!product) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } })
    }
    res.json({ success: true, data: product })
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
})
