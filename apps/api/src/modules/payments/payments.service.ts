/**
 * KOSHK SKATE ERP — Payments Service
 * Phase 06 — Payments & Treasury
 */

import { eq } from 'drizzle-orm'
import { db } from '../../db/connection'
import { paymentMethods, treasuryAccounts } from '../../db/schema/payments'
import type { PaymentMethodDTO, TreasuryAccountDTO } from './payments.types'

export async function listActivePaymentMethods(): Promise<PaymentMethodDTO[]> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    nameAr: r.nameAr,
    isActive: r.isActive,
    treasuryAccountId: r.treasuryAccountId,
  }))
}

export async function listTreasuryAccounts(): Promise<TreasuryAccountDTO[]> {
  const rows = await db
    .select()
    .from(treasuryAccounts)

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    nameAr: r.nameAr,
    isActive: r.isActive,
    balance: parseFloat(String(r.balance)),
  }))
}
