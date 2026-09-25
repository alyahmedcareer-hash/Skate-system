import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { sales, saleItems, salePayments } from '../../db/schema/sales.js'
import { products } from '../../db/schema/products.js'
import { paymentMethods, treasuryMovements } from '../../db/schema/payments.js'
import { CreateSaleDTO, SaleDTO } from './sales.types.js'
import { BusinessRuleError, NotFoundError, AppError } from '../../utils/errors.js'

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
      throw new BusinessRuleError('سلة المشتريات فارغة', 'CART_EMPTY')
    }

    if (!data.payments || data.payments.length === 0) {
      throw new BusinessRuleError('المدفوعات مطلوبة', 'NO_PAYMENTS')
    }

    const [activeShiftRows] = await db.execute(
      sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${data.cashierId} AND status = 'active' LIMIT 1`
    )
    const activeShift = (activeShiftRows as any[])[0]
    if (!activeShift) {
      throw new BusinessRuleError('عملية إنشاء البيع تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
    }

    const saleId = await db.transaction(async (tx) => {
      let computedTotalAmount = 0
      const processedItems = []

      // 1. Process items and lock products
      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new BusinessRuleError('الكمية غير صالحة', 'INVALID_QUANTITY')
        }

        // Lock row FOR UPDATE
        const [productRow] = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        )

        const product = (productRow as unknown as any[])[0]
        if (!product) {
          throw new NotFoundError('المنتج غير موجود')
        }

        if (!product.is_active) {
          throw new BusinessRuleError('المنتج غير مفعل', 'PRODUCT_INACTIVE')
        }

        if (product.stock_quantity < item.quantity) {
          throw new BusinessRuleError('المخزون غير كاف', 'INSUFFICIENT_STOCK')
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
        if (p.amount <= 0) throw new BusinessRuleError('مبلغ الدفعة غير صالح', 'INVALID_PAYMENT_AMOUNT')
        
        // Verify payment method to treasury account mapping
        const [pmRow] = await tx.select().from(paymentMethods).where(eq(paymentMethods.id, p.paymentMethodId)).limit(1)
        if (!pmRow) throw new BusinessRuleError('طريقة الدفع غير صالحة', 'INVALID_PAYMENT_METHOD')
        
        // Auto-assign treasury account
        p.treasuryAccountId = pmRow.treasuryAccountId

        totalPaymentProvided += p.amount
      }

      // Floating point safe comparison
      if (Math.abs(computedTotalAmount - totalPaymentProvided) > 0.01) {
        throw new BusinessRuleError('المدفوعات لا تتطابق مع الإجمالي', 'PAYMENT_MISMATCH')
      }

      // 3. Create Sale
      const [saleResult] = await tx.insert(sales).values({
        saleCode: generateSaleCode(),
        customerId: data.customerId || null,
        cashierId: data.cashierId,
        shiftId: activeShift.id,
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
          shiftId: activeShift.id,
          notes: `Payment for Sale ${newSaleId}`
        })
      }

      return newSaleId
    })

    return (await this.getSale(saleId))!
  }

  static async cancelSale(saleId: number, adminUserId: number): Promise<SaleDTO> {
    const [activeShiftRows] = await db.execute(
      sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${adminUserId} AND status = 'active' LIMIT 1`
    )
    const activeShift = (activeShiftRows as any[])[0]
    if (!activeShift) {
      throw new BusinessRuleError('عملية إلغاء البيع تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
    }
    
    await db.transaction(async (tx) => {
      // Lock sale FOR UPDATE
      const [saleRow] = await tx.execute(
        sql`SELECT * FROM sales WHERE id = ${saleId} FOR UPDATE`
      )
      const sale = (saleRow as unknown as any[])[0]

      if (!sale) throw new NotFoundError('البيع غير موجود')
      if (sale.status === 'cancelled') throw new AppError('تم الإلغاء بالفعل', 409, 'ALREADY_CANCELLED')

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
          shiftId: activeShift ? activeShift.id : null,
          notes: `Refund for Cancelled Sale ${saleId}`
        })
      }
    })

    return (await this.getSale(saleId))!
  }
}
