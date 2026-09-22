/**
 * KOSHK SKATE ERP — Rentals Service (Frontend)
 * Phase 05 — Rental POS Core
 *
 * API client for all rental endpoints.
 * DEC-060: No payment endpoints — Phase 06.
 * DEC-065: Client never sends rental_amount — server calculates it.
 */

import api from '../../services/api'

// ---------------------------------------------------------------------------
// DTOs mirroring backend types
// ---------------------------------------------------------------------------

export type RentalStatus = 'active' | 'returned' | 'cancelled'
export type RentalOperationalStatus = 'normal' | 'ending_soon' | 'overdue'

export interface RentalSkateInfo {
  id:        number
  skateCode: string
  size:      string
  type:      string | null
}

export interface RentalCustomerInfo {
  id:               number
  name:             string
  phone:            string
  nationalIdMasked: string
}

export interface RentalCashierInfo {
  id:   number
  name: string
}

export interface RentalDTO {
  id:              number
  rentalCode:      string
  skate:           RentalSkateInfo
  customer:        RentalCustomerInfo
  cashier:         RentalCashierInfo
  shiftId:         number | null
  durationMinutes: number
  pricePerHour:    number
  rentalAmount:    number
  startedAt:       string
  expectedEndAt:   string
  returnedAt:      string | null
  status:          RentalStatus
  notes:           string | null
  createdAt:       string
  updatedAt:       string
  [key: string]:   unknown  // DataTable generic constraint
}

export interface ActiveRentalDTO extends RentalDTO {
  operationalStatus: RentalOperationalStatus
  remainingMinutes:  number
}

export interface PaginationMeta {
  page:       number
  perPage:    number
  total:      number
  totalPages: number
}

export interface PricePreviewDTO {
  durationMinutes: number
  pricePerHour:    number
  rentalAmount:    number
}

export interface CustomerRentalHistoryItem {
  id:              number
  rentalCode:      string
  skate:           RentalSkateInfo
  durationMinutes: number
  rentalAmount:    number
  startedAt:       string
  expectedEndAt:   string
  returnedAt:      string | null
  status:          RentalStatus
  [key: string]:   unknown
}

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

export interface StartRentalBody {
  skateId:         number
  customerId:      number
  durationMinutes: number
  notes?:          string
  payments:        { paymentMethodId: number; amount: number }[]
}

// ---------------------------------------------------------------------------
// Helper — build query string
// ---------------------------------------------------------------------------

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const str = qs.toString()
  return str ? `?${str}` : ''
}

// ---------------------------------------------------------------------------
// Rentals label helpers
// ---------------------------------------------------------------------------

export function getRentalStatusLabel(status: RentalStatus): string {
  switch (status) {
    case 'active':    return 'نشط'
    case 'returned':  return 'مُعاد'
    case 'cancelled': return 'ملغي'
  }
}

export function getOperationalStatusLabel(status: RentalOperationalStatus): string {
  switch (status) {
    case 'normal':      return 'عادي'
    case 'ending_soon': return 'ينتهي قريباً'
    case 'overdue':     return 'متأخر'
  }
}

// Map operational status to BadgeStatus (DEC-064, DEC-066)
export function operationalStatusToBadge(status: RentalOperationalStatus): 'active' | 'overdue' | 'rented' {
  switch (status) {
    case 'normal':      return 'active'      // success green
    case 'ending_soon': return 'rented'      // info blue (warning-adjacent, reuse rented for now)
    case 'overdue':     return 'overdue'     // danger red
  }
}

// Map lifecycle status to BadgeStatus
export function lifetimeStatusToBadge(status: RentalStatus): 'active' | 'completed' | 'cancelled' {
  switch (status) {
    case 'active':    return 'active'
    case 'returned':  return 'completed'
    case 'cancelled': return 'cancelled'
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const rentalsService = {
  /**
   * POST /api/v1/rentals — start rental (Rental POS)
   * DEC-065: Do NOT send rental_amount — server calculates it.
   */
  create: (body: StartRentalBody) =>
    api.post<{ success: boolean; data: RentalDTO }>('/api/v1/rentals', body),

  /**
   * GET /api/v1/rentals/active — active rentals with operational status
   * DEC-064, DEC-066: server computes operationalStatus and remainingMinutes
   */
  getActive: () =>
    api.get<{ success: boolean; data: ActiveRentalDTO[] }>('/api/v1/rentals/active'),

  /**
   * GET /api/v1/rentals/calculate-price — price preview (server-authoritative)
   * DEC-065, DEC-067: server calculates and rounds rental_amount
   */
  calculatePrice: (durationMinutes: number) =>
    api.get<{ success: boolean; data: PricePreviewDTO }>(
      `/api/v1/rentals/calculate-price?durationMinutes=${durationMinutes}`,
    ),

  /**
   * GET /api/v1/rentals — list all rentals with filters
   */
  list: (params?: { page?: number; perPage?: number; status?: string; skateId?: number; customerId?: number }) =>
    api.get<{ success: boolean; data: RentalDTO[]; pagination: PaginationMeta }>(
      `/api/v1/rentals${buildQuery(params ?? {})}`,
    ),

  /**
   * GET /api/v1/rentals/:id — single rental detail
   */
  get: (id: number) =>
    api.get<{ success: boolean; data: RentalDTO }>(`/api/v1/rentals/${id}`),

  /**
   * GET /api/v1/rentals/config — Rental POS configuration (F-06 — DEC-069)
   * Returns the configured hourly rate and standard duration options from settings.
   * Frontend must NOT define standard durations as a business constant (BR-26).
   */
  getConfig: () =>
    api.get<{ success: boolean; data: { pricePerHour: number; durationOptions: number[]; lateFeePerMinute: number } }>('/api/v1/rentals/config'),

  /**
   * GET /api/v1/customers/:id/rentals — customer rental history (DEC-055)
   */
  getCustomerRentals: (customerId: number, params?: { page?: number; perPage?: number }) =>
    api.get<{ success: boolean; data: CustomerRentalHistoryItem[]; pagination: PaginationMeta }>(
      `/api/v1/customers/${customerId}/rentals${buildQuery(params ?? {})}`,
    ),

  /**
   * POST /api/v1/rentals/:id/return — return a rental and process late fee (Phase 07)
   */
  return: (id: number, body: ReturnRentalBody) =>
    api.post<{ success: boolean; data: RentalDTO }>(`/api/v1/rentals/${id}/return`, body),
}

export interface ReturnRentalBody {
  waivedFee: number
  waiverReason?: string
  payments: { paymentMethodId: number; amount: number }[]
  inspection: {
    wheelsCondition: 'good' | 'minor_damage' | 'damaged' | 'broken'
    brakeCondition: 'good' | 'minor_damage' | 'damaged' | 'broken'
    strapCondition: 'good' | 'minor_damage' | 'damaged' | 'broken'
    bearingsCondition: 'good' | 'minor_damage' | 'damaged' | 'broken'
    bodyCondition: 'good' | 'minor_damage' | 'damaged' | 'broken'
    maintenanceRequired: boolean
    otherNotes?: string
  }
}
