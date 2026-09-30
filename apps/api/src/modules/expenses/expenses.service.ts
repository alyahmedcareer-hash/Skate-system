import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { expenses, cashierShifts } from '../../db/schema/treasury.js'
import { treasuryMovements } from '../../db/schema/payments.js'
import { users } from '../../db/schema/users.js'
import { auditService } from '../audit/audit.service.js'
import { AppError, BusinessRuleError } from '../../utils/errors.js'
import type { CreateExpenseInput, ExpenseDTO } from './expenses.types.js'

export async function recordExpense(cashierId: number, input: CreateExpenseInput): Promise<ExpenseDTO> {
  return await db.transaction(async (tx) => {
    // 1. Get active shift
    const [activeShiftRows] = await tx.execute(
      sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${cashierId} AND status = 'active' LIMIT 1`
    )
    const activeShift = (activeShiftRows as unknown as any[])[0]
    if (!activeShift) {
      throw new BusinessRuleError('عملية تسجيل المصروف تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
    }
    const shiftId = activeShift.id

    // 2. Insert expense
    const [result] = await tx.insert(expenses).values({
      amount: String(input.amount),
      description: input.description,
      categoryId: input.categoryId || null,
      cashierId,
      shiftId,
    })

    const newId = result.insertId

    // 3. Create treasury movement (Cash Out)
    const [cashAccountRows] = await tx.execute(
      sql`SELECT id FROM treasury_accounts WHERE is_cash_drawer = true LIMIT 1`
    )
    const cashAccount = (cashAccountRows as unknown as any[])[0]
    if (!cashAccount) {
      throw new BusinessRuleError('لا يوجد درج نقدية محدد في النظام', 'NO_CASH_DRAWER')
    }
    const treasuryAccountId = cashAccount.id
    
    await tx.insert(treasuryMovements).values({
      treasuryAccountId,
      amount: String(input.amount),
      type: 'out',
      referenceType: 'expense',
      referenceId: newId,
      cashierId,
      shiftId,
      notes: input.description
    })

    // 4. Update treasury balance
    await tx.execute(
      sql`UPDATE treasury_accounts SET balance = balance - ${input.amount}, updated_at = NOW() WHERE id = ${treasuryAccountId}`
    )

    await auditService.log({ userId: cashierId, action: 'CREATE_EXPENSE', entityType: 'EXPENSE', entityId: String(newId), newValue: { amount: input.amount, categoryId: input.categoryId } }, tx)

    // 5. Fetch inserted
    const [row] = await tx.select().from(expenses).where(eq(expenses.id, newId))
    
    return {
      id: row.id,
      amount: parseFloat(String(row.amount)),
      description: row.description,
      categoryId: row.categoryId,
      cashierId: row.cashierId,
      shiftId: row.shiftId,
      createdAt: row.createdAt.toISOString()
    }
  })
}

export async function listExpenses(): Promise<ExpenseDTO[]> {
  const rows = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      description: expenses.description,
      categoryId: expenses.categoryId,
      cashierId: expenses.cashierId,
      cashierName: users.name,
      shiftId: expenses.shiftId,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(users, eq(users.id, expenses.cashierId))
    .orderBy(desc(expenses.createdAt))

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat(String(r.amount)),
    description: r.description,
    categoryId: r.categoryId,
    cashierId: r.cashierId,
    cashierName: r.cashierName || undefined,
    shiftId: r.shiftId,
    createdAt: r.createdAt.toISOString()
  }))
}
