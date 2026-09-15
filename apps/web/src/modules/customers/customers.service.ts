/**
 * KOSHK SKATE ERP — Customers Service (Frontend)
 * Phase 04 — Customers Module
 *
 * Uses the shared `api` client (api.ts).
 * Note: api.get() does NOT support params — query strings must be built manually.
 *
 * DEC-056: List API returns `nationalIdMasked` (not full nationalId).
 *          Profile API returns full `nationalId`.
 */

import api from '../../services/api'

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CustomerListItemDTO {
  id:               number
  name:             string
  phone:            string
  nationalIdMasked: string      // DEC-056: '****1234' or '—'
  registrationDate: string      // 'YYYY-MM-DD'
  notes:            string | null
  isActive:         boolean
  createdAt:        string
  updatedAt:        string
  [key: string]:    unknown     // Required for DataTable generic constraint
}

export interface CustomerDTO {
  id:               number
  name:             string
  phone:            string
  nationalId:       string | null   // DEC-056: full value — profile only
  registrationDate: string
  notes:            string | null
  isActive:         boolean
  createdAt:        string
  updatedAt:        string
}

export interface PaginationMeta {
  page:       number
  perPage:    number
  total:      number
  totalPages: number
}

export interface CustomerListResponse {
  success:    boolean
  data:       CustomerListItemDTO[]
  pagination: PaginationMeta
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateCustomerBody {
  name:        string
  phone:       string
  nationalId?: string
  notes?:      string
}

export interface UpdateCustomerBody {
  name?:       string
  phone?:      string
  nationalId?: string | null
  notes?:      string | null
}

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export interface ListCustomersParams {
  q?:        string
  isActive?: '1' | '0' | 'all'
  page?:     number
  perPage?:  number
  sortBy?:   string
  sortDir?:  'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Helper — build query string
// ---------------------------------------------------------------------------

function buildQuery(params: ListCustomersParams): string {
  const qs = new URLSearchParams()
  if (params.q)        qs.set('q',        params.q)
  if (params.isActive) qs.set('isActive', params.isActive)
  if (params.page)     qs.set('page',     String(params.page))
  if (params.perPage)  qs.set('perPage',  String(params.perPage))
  if (params.sortBy)   qs.set('sortBy',   params.sortBy)
  if (params.sortDir)  qs.set('sortDir',  params.sortDir)
  const str = qs.toString()
  return str ? `?${str}` : ''
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const customersService = {
  /**
   * List customers (paginated, searchable).
   * Default: active customers only (isActive=1).
   * DEC-056: response includes nationalIdMasked, NOT nationalId.
   */
  list: (params?: ListCustomersParams) =>
    api.get<CustomerListResponse>(`/api/v1/customers${buildQuery(params ?? {})}`),

  /**
   * Get customer profile.
   * DEC-056: response includes full nationalId.
   */
  get: (id: number) =>
    api.get<{ success: boolean; data: CustomerDTO }>(`/api/v1/customers/${id}`),

  /**
   * Create a new customer.
   * DEC-051: name and phone required; nationalId optional.
   */
  create: (body: CreateCustomerBody) =>
    api.post<{ success: boolean; data: CustomerDTO }>('/api/v1/customers', body),

  /**
   * Update an existing customer.
   */
  update: (id: number, body: UpdateCustomerBody) =>
    api.put<{ success: boolean; data: CustomerDTO }>(`/api/v1/customers/${id}`, body),

  /**
   * Soft-deactivate a customer (DEC-052).
   * Requires customers.deactivate permission (DEC-058).
   */
  deactivate: (id: number) =>
    api.post<{ success: boolean; data: CustomerDTO }>(`/api/v1/customers/${id}/deactivate`),

  /**
   * Reactivate a deactivated customer (DEC-052).
   * Requires customers.deactivate permission (DEC-058).
   */
  activate: (id: number) =>
    api.post<{ success: boolean; data: CustomerDTO }>(`/api/v1/customers/${id}/activate`),
}
