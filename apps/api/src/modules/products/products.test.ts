import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'
import { getTestToken } from '../../../tests/setup.js'

describe('Products API', () => {
  let adminToken: string
  let cashierToken: string
  let categoryId: number
  let productId: number

  beforeAll(async () => {
    adminToken = await getTestToken('Administrator')
    cashierToken = await getTestToken('Cashier')
  })

  it('Admin can create a category', async () => {
    const res = await request(app)
      .post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Spare Parts',
        nameAr: 'قطع غيار'
      })
    
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    categoryId = res.body.data.id
  })

  it('Admin can create a product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wheel 80mm',
        nameAr: 'عجلة 80 مم',
        categoryId,
        price: 150,
        stockQuantity: 10
      })
    
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    productId = res.body.data.id
  })

  it('Cashier cannot create a product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Bearing',
        nameAr: 'رمان بلي',
        categoryId,
        price: 50,
        stockQuantity: 20
      })
    
    expect(res.status).toBe(403)
  })

  it('Cashier can view products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Admin can adjust stock quantity', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stockQuantity: 15
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.stockQuantity).toBe(15)
  })

  it('Cannot set negative stock quantity', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stockQuantity: -5
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('STOCK_CANNOT_BE_NEGATIVE')
  })
})
