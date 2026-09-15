/**
 * KOSHK SKATE ERP — Customers Types
 * Phase 04 — Customers Module
 *
 * Design decisions:
 *   - DEC-051: name + phone required; national_id + notes optional
 *   - DEC-052: is_active soft-deactivation
 *   - DEC-053: national_id unique when provided
 *   - DEC-054: phone NOT unique
 *   - DEC-056: list DTO includes national_id_masked (not full national_id)
 *              profile DTO includes full national_id
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * DEC-056: Masks a National ID for list display.
 * Shows last 4 chars with asterisks for the rest.
 * Returns '—' if value is null/empty.
 *
 * Examples:
 *   '12345678901234' → '**********1234'
 *   '1234'           → '1234'
 *   null             → '—'
 */
export function maskNationalId(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 4) return value
  return '*'.repeat(value.length - 4) + value.slice(-4)
}

// ---------------------------------------------------------------------------
// DTOs — shapes returned to the client
// ---------------------------------------------------------------------------

/**
 * CustomerListItemDTO — returned by GET /api/v1/customers (list endpoint)
 * national_id is MASKED per DEC-056.
 */
export interface CustomerListItemDTO {
  id:                 number
  name:               string
  phone:              string
  nationalIdMasked:   string          // DEC-056: '****1234' or '—'
  registrationDate:   string          // ISO date string YYYY-MM-DD
  notes:              string | null
  isActive:           boolean
  createdAt:          string
  updatedAt:          string
}

/**
 * CustomerDTO — returned by GET /api/v1/customers/:id (profile endpoint)
 * Full national_id included per DEC-056.
 */
export interface CustomerDTO {
  id:               number
  name:             string
  phone:            string
  nationalId:       string | null     // Full value — profile endpoint only (DEC-056)
  registrationDate: string            // ISO date string YYYY-MM-DD
  notes:            string | null
  isActive:         boolean
  createdAt:        string
  updatedAt:        string
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateCustomerRequest {
  name:        string        // DEC-051: required
  phone:       string        // DEC-051: required
  nationalId?: string        // DEC-051: optional; DEC-053: unique when provided
  notes?:      string        // optional
  // registration_date: system-generated at creation — NOT in request body
}

export interface UpdateCustomerRequest {
  name?:       string
  phone?:      string
  nationalId?: string | null  // DEC-053: null clears the field
  notes?:      string | null
  // is_active NOT editable via this endpoint — use /deactivate and /activate endpoints
}

// ---------------------------------------------------------------------------
// List query filters
// ---------------------------------------------------------------------------

export interface ListCustomersQuery {
  q?:        string            // search across name, phone, national_id
  isActive?: string            // '1' (default) | '0' | 'all'
  page?:     string
  perPage?:  string
  sortBy?:   string
  sortDir?:  'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Paginated list response wrapper
// ---------------------------------------------------------------------------

export interface PaginatedCustomers {
  data: CustomerListItemDTO[]
  pagination: {
    page:       number
    perPage:    number
    total:      number
    totalPages: number
  }
}
