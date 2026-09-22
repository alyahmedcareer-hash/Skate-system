import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { sales, saleItems, salePayments } from '../../db/schema/sales.js'
import { products } from '../../db/schema/products.js'
import { paymentMethods, treasuryMovements } from '../../db/schema/payments.js'
import { CreateSaleDTO, SaleDTO } from './sales.types.js'

function generateSaleCode(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `SAL-${timestamp}${random}`
}

export class SalesService {
  static async listSales(): Promise<SaleDTO[]> {
    const records = await db.select().from(sales).orderBy(desc(sales.id))
    return records.map(r => ({
      id: r.id,
      saleCode: r.saleCode,
      customerId: r.customerId,
      cashierId: r.cashierId,
      shiftId: r.shiftId,
      totalAmount: parseFloat(r.totalAmount as any),
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt
    }))
  }

  static async getSale(id: number): Promise<SaleDTO | null> {
    const [record] = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
    if (!record) return null

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id))
    const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, id))

    return {
      id: record.id,
      saleCode: record.saleCode,
      customerId: record.customerId,
      cashierId: record.cashierId,
      shiftId: record.shiftId,
      totalAmount: parseFloat(record.totalAmount as any),
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      items: items.map(i => ({
        id: i.id,
        saleId: i.saleId,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice as any),
        totalPrice: parseFloat(i.totalPrice as any)
      })),
      payments: payments.map(p => ({
        id: p.id,
        saleId: p.saleId,
        paymentMethodId: p.paymentMethodId,
        amount: parseFloat(p.amount as any),
        treasuryAccountId: p.treasuryAccountId,
        createdAt: p.createdAt
      }))
    }
  }

  static async createSale(data: CreateSaleDTO): Promise<SaleDTO> {
    if (!data.items || data.items.length === 0) {
      throw new Error('CART_EMPTY')
    }

    if (!data.payments || data.payments.length === 0) {
      throw new Error('NO_PAYMENTS')
    }

    const saleId = await db.transaction(async (tx) => {
      let computedTotalAmount = 0
      const processedItems = []

      // 1. Process items and lock products
      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error('INVALID_QUANTITY')
        }

        // Lock row FOR UPDATE
        const [productRow] = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        )

        const product = (productRow as unknown as any[])[0]
        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND')
        }

        if (!product.is_active) {
          throw new Error('PRODUCT_INACTIVE')
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error('INSUFFICIENT_STOCK')
        }

        const unitPrice = parseFloat(product.price)
        const totalPrice = unitPrice * item.quantity
        computedTotalAmount += totalPrice

        processedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice
        })

        // Deduct stock
        await tx.update(products)
          .set({ stockQuantity: product.stock_quantity - item.quantity })
          .where(eq(products.id, item.productId))
      }

      // 2. Validate payments
      let totalPaymentProvided = 0
      for (const p of data.payments) {
        if (p.amount <= 0) throw new Error('INVALID_PAYMENT_AMOUNT')
        
        // Verify payment method to treasury account mapping
        const [pmRow] = await tx.select().from(paymentMethods).where(eq(paymentMethods.id, p.paymentMethodId)).limit(1)
        if (!pmRow) throw new Error('INVALID_PAYMENT_METHOD')
        
        // Auto-assign treasury account
        p.treasuryAccountId = pmRow.treasuryAccountId

        totalPaymentProvided += p.amount
      }

      // Floating point safe comparison
      if (Math.abs(computedTotalAmount - totalPaymentProvided) > 0.01) {
        throw new Error('PAYMENT_MISMATCH')
      }

      // 3. Create Sale
      const [saleResult] = await tx.insert(sales).values({
        saleCode: generateSaleCode(),
        customerId: data.customerId || null,
        cashierId: data.cashierId,
        shiftId: data.shiftId || null,
        totalAmount: computedTotalAmount.toString(),
        notes: data.notes || null,
        status: 'completed'
      })

      const newSaleId = saleResult.insertId

      // 4. Create Sale Items
      for (const pItem of processedItems) {
        await tx.insert(saleItems).values({
          saleId: newSaleId,
          productId: pItem.productId,
          quantity: pItem.quantity,
          unitPrice: pItem.unitPrice.toString(),
          totalPrice: pItem.totalPrice.toString()
        })
      }

      // 5. Create Sale Payments & Treasury Movements
      for (const p of data.payments) {
        const [paymentResult] = await tx.insert(salePayments).values({
          saleId: newSaleId,
          paymentMethodId: p.paymentMethodId,
          amount: p.amount.toString(),
          treasuryAccountId: p.treasuryAccountId
        })

        await tx.insert(treasuryMovements).values({
          treasuryAccountId: p.treasuryAccountId,
          amount: p.amount.toString(),
          type: 'in',
          referenceType: 'sale_payment',
          referenceId: newSaleId, // link to sale ID
          cashierId: data.cashierId,
          notes: `Payment for Sale ${newSaleId}`
        })
      }

      return newSaleId
    })

    return (await this.getSale(saleId))!
  }

  static async cancelSale(saleId: number, adminUserId: number): Promise<SaleDTO> {
    await db.transaction(async (tx) => {
      // Lock sale FOR UPDATE
      const [saleRow] = await tx.execute(
        sql`SELECT * FROM sales WHERE id = ${saleId} FOR UPDATE`
      )
      const sale = (saleRow as unknown as any[])[0]

      if (!sale) throw new Error('SALE_NOT_FOUND')
      if (sale.status === 'cancelled') throw new Error('ALREADY_CANCELLED')

      // Mark cancelled
      await tx.update(sales).set({ status: 'cancelled' }).where(eq(sales.id, saleId))

      // Lock and restore products
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId))
      
      for (const item of items) {
        const [productRow] = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        )
        const product = (productRow as unknown as any[])[0]
        if (product) {
          await tx.update(products)
            .set({ stockQuantity: product.stock_quantity + item.quantity })
            .where(eq(products.id, item.productId))
        }
      }

      // Refund treasury movements
      const payments = await tx.select().from(salePayments).where(eq(salePayments.saleId, saleId))
      for (const p of payments) {
        await tx.insert(treasuryMovements).values({
          treasuryAccountId: p.treasuryAccountId,
          amount: p.amount,
          type: 'out',
          referenceType: 'sale_refund',
          referenceId: saleId,
          cashierId: adminUserId,
          notes: `Refund for Cancelled Sale ${saleId}`
        })
      }
    })

    return (await this.getSale(saleId))!
  }
}
