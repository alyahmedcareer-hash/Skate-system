import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app.js'
import { getTestToken, getDb } from '../../../tests/setup.js'
import { treasuryMovements, treasuryAccounts, paymentMethods } from '../../db/schema/payments.js'
import { eq, desc } from 'drizzle-orm'

describe('Sales API', () => {
  let adminToken: string
  let cashierToken: string
  let categoryId: number
  let productId: number
  let paymentMethodId: number
  let treasuryAccountId: number
  let saleId: number

  beforeAll(async () => {
    adminToken = await getTestToken('Administrator')
    cashierToken = await getTestToken('Cashier')
    
    // Setup Category & Product
    const catRes = await request(app).post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Accessories', nameAr: 'إكسسوارات' })
    categoryId = catRes.body.data.id

    const prodRes = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Helmet', nameAr: 'خوذة', categoryId, price: 200, stockQuantity: 5 })
    productId = prodRes.body.data.id

    // Setup Treasury/Payment Method (from seed)
    const pmRes = await getDb().select().from(paymentMethods).limit(1)
    paymentMethodId = pmRes[0].id
    treasuryAccountId = pmRes[0].treasuryAccountId
  })

  it('Creates a sale, deducts stock, and records treasury movement', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 2 }
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 400 }
        ]
      })
    
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    saleId = res.body.data.id
    expect(res.body.data.totalAmount).toBe(400)
    
    // Verify stock deducted
    const prodRes = await request(app).get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(prodRes.body.data.stockQuantity).toBe(3) // 5 - 2

    // Verify treasury movement IN
    const db = getDb()
    const movs = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, saleId)).orderBy(desc(treasuryMovements.id))
    const salePaymentMovement = movs.find(m => m.referenceType === 'sale_payment')
    expect(salePaymentMovement).toBeDefined()
    expect(parseFloat(salePaymentMovement!.amount)).toBe(400)
    expect(salePaymentMovement!.type).toBe('in')
  })

  it('Fails to create sale if insufficient stock', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 10 } // Only 3 left
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 2000 }
        ]
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('Fails to create sale if payment mismatch', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 1 } // Price = 200
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 150 } // Mismatch!
        ]
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('PAYMENT_MISMATCH')
  })

  it('Cashier cannot cancel a sale', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${cashierToken}`)
    
    expect(res.status).toBe(403)
  })

  it('Admin can cancel a sale, restores stock and refunds treasury', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')

    // Verify stock restored
    const prodRes = await request(app).get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(prodRes.body.data.stockQuantity).toBe(5) // 3 + 2

    // Verify treasury movement OUT
    const db = getDb()
    const movs = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, saleId)).orderBy(desc(treasuryMovements.id))
    const refundMovement = movs.find(m => m.referenceType === 'sale_refund')
    expect(refundMovement).toBeDefined()
    expect(parseFloat(refundMovement!.amount)).toBe(400)
    expect(refundMovement!.type).toBe('out')
  })

  it('Cannot cancel an already cancelled sale', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ALREADY_CANCELLED')
  })
})
