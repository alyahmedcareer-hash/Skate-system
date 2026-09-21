/**
 * KOSHK SKATE ERP — Payments Service (Frontend)
 * Phase 06 — Payment Integration
 */

import api from '../../services/api'

export interface PaymentMethodDTO {
  id: number
  name: string
  type: string
  isActive: boolean
}

export const paymentsService = {
  /**
   * GET /api/v1/payments/methods — List active payment methods
   */
  listMethods: () =>
    api.get<{ success: boolean; data: PaymentMethodDTO[] }>('/api/v1/payments/methods'),
}
