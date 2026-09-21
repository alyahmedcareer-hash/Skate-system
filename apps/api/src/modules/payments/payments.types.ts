/**
 * KOSHK SKATE ERP — Payments Types
 * Phase 06 — Payments & Treasury
 */

export interface PaymentMethodDTO {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  treasuryAccountId: number
}

export interface TreasuryAccountDTO {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  balance: number
}
