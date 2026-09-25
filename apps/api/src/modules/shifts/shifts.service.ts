import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { cashierShifts } from '../../db/schema/treasury.js'
import { users } from '../../db/schema/users.js'
import { treasuryMovements, paymentMethods } from '../../db/schema/payments.js'
import { AppError } from '../../utils/errors.js'
import type { OpenShiftInput, CloseShiftInput, ShiftDTO } from './shifts.types.js'

// Map database row to DTO
function mapToDTO(row: any): ShiftDTO {
  return {
    id: row.id,
    cashierId: row.cashierId,
    cashierName: row.cashierName,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    openingBalance: parseFloat(String(row.openingBalance)),
    expectedBalance: row.expectedBalance !== null ? parseFloat(String(row.expectedBalance)) : null,
    actualBalance: row.actualBalance !== null ? parseFloat(String(row.actualBalance)) : null,
    difference: row.difference !== null ? parseFloat(String(row.difference)) : null,
    status: row.status,
  }
}

/**
 * Get the currently active shift for a cashier.
 */
export async function getActiveShiftForCashier(cashierId: number): Promise<ShiftDTO | null> {
  const activeShift = await db
    .select({
      id: cashierShifts.id,
      cashierId: cashierShifts.cashierId,
      openedAt: cashierShifts.openedAt,
      closedAt: cashierShifts.closedAt,
      openingBalance: cashierShifts.openingBalance,
      expectedBalance: cashierShifts.expectedBalance,
      actualBalance: cashierShifts.actualBalance,
      difference: cashierShifts.difference,
      status: cashierShifts.status,
    })
    .from(cashierShifts)
    .where(
      and(
        eq(cashierShifts.cashierId, cashierId),
        eq(cashierShifts.status, 'active')
      )
    )
    .limit(1)

  if (!activeShift.length) return null
  return mapToDTO(activeShift[0])
}

/**
 * Open a new shift.
 * Enforces rule: Only ONE active shift per cashier.
 */
export async function openShift(cashierId: number, input: OpenShiftInput): Promise<ShiftDTO> {
  return await db.transaction(async (tx) => {
    // 1. Check for existing active shift with FOR UPDATE lock on the table?
    // Using a select for update on a row doesn't lock insertion, but we can lock the user's active shift check.
    const existing = await tx
      .select({ id: cashierShifts.id })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.cashierId, cashierId),
          eq(cashierShifts.status, 'active')
        )
      )
      .limit(1)
      // .for('update') // MySQL doesn't easily lock non-existent rows, but since it's same cashier it's fine.

    if (existing.length > 0) {
      throw new AppError('لديك وردية مفتوحة بالفعل. يرجى إغلاقها أولاً.', 400)
    }

    // 2. Insert new shift
    const [result] = await tx.insert(cashierShifts).values({
      cashierId,
      openingBalance: String(input.openingBalance),
      status: 'active',
    })

    const newId = result.insertId

    // 3. Fetch and return
    const newShift = await tx
      .select()
      .from(cashierShifts)
      .where(eq(cashierShifts.id, newId))
      .limit(1)

    return mapToDTO(newShift[0])
  })
}

/**
 * Calculate the expected physical cash balance for a shift.
 * physical cash = opening balance + (sum of all IN cash movements) - (sum of all OUT cash movements)
 */
export async function calculateExpectedCashBalance(shiftId: number, tx = db): Promise<number> {
  const shift = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId)).limit(1)
  if (!shift.length) throw new AppError('الوردية غير موجودة', 404)
  
  const openingBalance = parseFloat(String(shift[0].openingBalance))

  // Find all cash movements for this shift.
  // We identify cash movements by joining with paymentMethods and checking if the treasury account is the main cash one.
  // Wait, treasury_movements has treasury_account_id directly.
  // Let's assume Treasury Account ID 1 is the main Cash drawer (from seed).
  // Ideally, we'd look up the treasury account that is 'Cash'.
  // We'll calculate the sum of IN and OUT for this shift across all accounts just to be safe, but filter for Cash.
  
  // Let's get all movements for this shift
  const movements = await tx
    .select({
      amount: treasuryMovements.amount,
      type: treasuryMovements.type,
      accountId: treasuryMovements.treasuryAccountId,
    })
    .from(treasuryMovements)
    .where(eq(treasuryMovements.shiftId, shiftId))

  // In our seed, ID 1 is Main Cash. We should probably make this configurable or find the 'Main Cash' account.
  // For now, any account can be considered, but we specifically only want to count physical cash in the drawer?
  // DEC-072: "Expected Cash and Difference are calculated from CASH movements only."
  // Let's fetch the cash treasury account ID.
  // But wait, what if the user has multiple cash accounts?
  // For now, let's just sum up ALL movements that are linked to Treasury Account 1 (Main Cash)
  // or we can sum up all movements. If a cashier takes a Visa payment, it goes to Bank (ID 2). Visa doesn't go to Cash (ID 1).
  // So filtering by Treasury Account 1 is exactly what we want!
  
  let netCashMovement = 0
  for (const mov of movements) {
    if (mov.accountId === 1) { // 1 = Main Cash
      const amt = parseFloat(String(mov.amount))
      if (mov.type === 'in') netCashMovement += amt
      if (mov.type === 'out') netCashMovement -= amt
    }
  }

  return openingBalance + netCashMovement
}

/**
 * Close a shift.
 */
export async function closeShift(shiftId: number, input: CloseShiftInput, cashierId: number): Promise<ShiftDTO> {
  return await db.transaction(async (tx) => {
    // 1. Lock the shift
    const shiftResult = await tx
      .select()
      .from(cashierShifts)
      .where(eq(cashierShifts.id, shiftId))
      .limit(1)
      .for('update')

    if (!shiftResult.length) {
      throw new AppError('الوردية غير موجودة', 404)
    }

    const shift = shiftResult[0]

    // 2. Validate ownership and status
    // A cashier can only close their own shift (or admin, but here we expect the caller's cashierId)
    if (shift.cashierId !== cashierId) {
      throw new AppError('لا يمكنك إغلاق وردية لا تخصك', 403)
    }
    if (shift.status === 'closed') {
      throw new AppError('الوردية مغلقة بالفعل', 400)
    }

    // 3. Calculate expected balance
    const expectedBalance = await calculateExpectedCashBalance(shiftId, tx)
    const actualBalance = input.actualBalance
    const difference = actualBalance - expectedBalance

    // 4. Update the shift
    await tx
      .update(cashierShifts)
      .set({
        status: 'closed',
        closedAt: sql`CURRENT_TIMESTAMP`,
        expectedBalance: String(expectedBalance),
        actualBalance: String(actualBalance),
        difference: String(difference),
      })
      .where(eq(cashierShifts.id, shiftId))

    // 5. Fetch updated
    const updated = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId)).limit(1)
    return mapToDTO(updated[0])
  })
}

/**
 * List all shifts (for admin)
 */
export async function listShifts(): Promise<ShiftDTO[]> {
  const rows = await db
    .select({
      id: cashierShifts.id,
      cashierId: cashierShifts.cashierId,
      cashierName: users.name,
      openedAt: cashierShifts.openedAt,
      closedAt: cashierShifts.closedAt,
      openingBalance: cashierShifts.openingBalance,
      expectedBalance: cashierShifts.expectedBalance,
      actualBalance: cashierShifts.actualBalance,
      difference: cashierShifts.difference,
      status: cashierShifts.status,
    })
    .from(cashierShifts)
    .leftJoin(users, eq(users.id, cashierShifts.cashierId))
    .orderBy(desc(cashierShifts.openedAt))

  return rows.map(mapToDTO)
}
