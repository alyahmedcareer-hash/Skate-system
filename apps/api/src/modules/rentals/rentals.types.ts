/**
 * KOSHK SKATE ERP — Rentals Types
 * Phase 05 — Rental POS Core
 *
 * Design decisions:
 *   - DEC-060: No payment fields in Phase 05
 *   - DEC-062: rental_code format RN-NNNNN
 *   - DEC-063: shift_id nullable
 *   - DEC-064: persisted statuses: active | returned | cancelled
 *              computed operational statuses: normal | ending_soon | overdue
 *   - DEC-065: price_per_hour and rental_amount are immutable snapshots
 *   - DEC-066: ending_soon threshold = 5 minutes
 *   - DEC-067: rental_amount rounded to nearest whole EGP
 */

import type { RentalStatus, RentalOperationalStatus } from '../../db/schema/rentals.js'

// ---------------------------------------------------------------------------
// Embedded sub-objects (returned inside rental DTOs)
// ---------------------------------------------------------------------------

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
  nationalIdMasked: string  // DEC-056: masked
}

export interface RentalCashierInfo {
  id:   number
  name: string
}

// ---------------------------------------------------------------------------
// RentalDTO — full rental object returned by API
// ---------------------------------------------------------------------------

export interface RentalDTO {
  id:              number
  rentalCode:      string
  skate:           RentalSkateInfo
  customer:        RentalCustomerInfo
  cashier:         RentalCashierInfo
  shiftId:         number | null
  durationMinutes: number
  pricePerHour:    number   // historical snapshot — DEC-065
  rentalAmount:    number   // rounded whole EGP — DEC-067
  startedAt:       string   // ISO datetime
  expectedEndAt:   string   // ISO datetime
  returnedAt:      string | null
  status:          RentalStatus
  notes:           string | null
  createdAt:       string
  updatedAt:       string
}

// ---------------------------------------------------------------------------
// ActiveRentalDTO — rental detail with server-computed operational status
// Used by GET /api/v1/rentals/active — DEC-064, DEC-066
// ---------------------------------------------------------------------------

export interface ActiveRentalDTO extends RentalDTO {
  operationalStatus: RentalOperationalStatus  // computed — NOT persisted
  remainingMinutes:  number                   // GREATEST(0, diff in minutes)
}

// ---------------------------------------------------------------------------
// Request body — POST /api/v1/rentals
// ---------------------------------------------------------------------------

export interface StartRentalRequest {
  skateId:         number   // required integer > 0
  customerId:      number   // required integer > 0
  durationMinutes: number   // required integer > 0, no maximum (DEC-069)
  notes?:          string   // optional, max 1000 chars
  payments:        { paymentMethodId: number; amount: number }[] // Phase 06 payments array
  reservationId?:  number   // Phase 10 Atomic Fulfillment
}

// ---------------------------------------------------------------------------
// Request body — POST /api/v1/rentals/:id/return (Phase 07)
// ---------------------------------------------------------------------------

export interface ReturnRentalRequest {
  waivedFee: number
  waiverReason?: string
  payments: { paymentMethodId: number; amount: number }[] // For late fee, if any
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


// ---------------------------------------------------------------------------
// Query filters — GET /api/v1/rentals
// ---------------------------------------------------------------------------

export interface ListRentalsQuery {
  page?:       string
  perPage?:    string
  status?:     string          // 'active' | 'returned' | 'cancelled'
  skateId?:    string
  customerId?: string
  cashierId?:  string
  from?:       string          // ISO date — started_at range start
  to?:         string          // ISO date — started_at range end
}

// ---------------------------------------------------------------------------
// Price preview — GET /api/v1/rentals/calculate-price
// ---------------------------------------------------------------------------

export interface PricePreviewDTO {
  durationMinutes: number
  pricePerHour:    number  // current configured rate
  rentalAmount:    number  // rounded whole EGP (DEC-067)
}

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

export interface PaginatedRentals {
  data: RentalDTO[]
  pagination: {
    page:       number
    perPage:    number
    total:      number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Customer rental history — GET /api/v1/customers/:id/rentals (DEC-055)
// ---------------------------------------------------------------------------

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
}

export interface PaginatedCustomerRentals {
  data: CustomerRentalHistoryItem[]
  pagination: {
    page:       number
    perPage:    number
    total:      number
    totalPages: number
  }
}
