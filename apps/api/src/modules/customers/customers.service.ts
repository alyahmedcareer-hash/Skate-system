/**
 * KOSHK SKATE ERP — Customers Service
 * Phase 04 — Customers Module
 *
 * Business rules enforced here:
 *   - DEC-051: name + phone required; national_id optional
 *   - DEC-052: Soft-deactivation only (is_active); reactivatable; hard-delete prohibited
 *   - DEC-053: national_id UNIQUE — duplicate returns ConflictError (409)
 *              Catches MySQL ER_DUP_ENTRY (errno 1062) for national_id UNIQUE constraint
 *   - DEC-054: phone NOT unique — no uniqueness check for phone
 *   - DEC-055: Rental history, stats, analytics are FULLY DEFERRED — not in Phase 04
 *   - DEC-056: listCustomers() returns masked national_id; getCustomer() returns full value
 *
 * Length limits (application-level — mirrors DB column lengths):
 *   - name:       max 255 chars
 *   - phone:      max 20 chars
 *   - nationalId: max 50 chars
 */

import { eq, like, or, and, sql, count, asc, desc } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { customers } from '../../db/schema/customers.js'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../utils/errors.js'
import {
  maskNationalId,
  type CustomerDTO,
  type CustomerListItemDTO,
  type CreateCustomerRequest,
  type UpdateCustomerRequest,
  type ListCustomersQuery,
  type PaginatedCustomers,
} from './customers.types.js'

// ---------------------------------------------------------------------------
// Field length limits — mirror DB column definitions
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH       = 255
const MAX_PHONE_LENGTH      = 20
const MAX_NATIONAL_ID_LENGTH = 50

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw DB row to a CustomerListItemDTO (masked national_id per DEC-056).
 */
function toListDTO(row: typeof customers.$inferSelect): CustomerListItemDTO {
  return {
    id:               row.id,
    name:             row.name,
    phone:            row.phone,
    nationalIdMasked: maskNationalId(row.nationalId),  // DEC-056
    registrationDate: row.registrationDate instanceof Date
      ? row.registrationDate.toISOString().split('T')[0]
      : String(row.registrationDate),
    notes:    row.notes ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

/**
 * Maps a raw DB row to a CustomerDTO (full national_id per DEC-056).
 */
function toProfileDTO(row: typeof customers.$inferSelect): CustomerDTO {
  return {
    id:               row.id,
    name:             row.name,
    phone:            row.phone,
    nationalId:       row.nationalId ?? null,  // DEC-056: full value in profile
    registrationDate: row.registrationDate instanceof Date
      ? row.registrationDate.toISOString().split('T')[0]
      : String(row.registrationDate),
    notes:    row.notes ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

/**
 * DEC-053: Detects MySQL duplicate key error and throws ConflictError for national_id.
 */
function handleDbError(err: unknown): never {
  const mysqlErr = err as { code?: string; errno?: number; message?: string }
  if (mysqlErr.errno === 1062 || mysqlErr.code === 'ER_DUP_ENTRY') {
    // Only national_id has a UNIQUE constraint — phone does not (DEC-054)
    throw new ConflictError('الرقم القومي مستخدم لعميل آخر')
  }
  throw err
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * List customers with pagination, search, and active filter.
 *
 * DEC-056: Returns masked national_id in list.
 * Default filter: isActive=true (active customers only).
 * isActive='all' returns all customers.
 * isActive='0' returns inactive only.
 */
export async function listCustomers(query: ListCustomersQuery): Promise<PaginatedCustomers> {
  const page    = Math.max(1, parseInt(query.page    ?? '1',  10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset  = (page - 1) * perPage

  // Build WHERE conditions
  const conditions = []

  // isActive filter (DEC-052)
  if (!query.isActive || query.isActive === '1') {
    conditions.push(eq(customers.isActive, true))
  } else if (query.isActive === '0') {
    conditions.push(eq(customers.isActive, false))
  }
  // isActive === 'all': no filter

  // Search filter: q searches name, phone, national_id (DEC-051, DEC-053)
  if (query.q && query.q.trim()) {
    const term = `%${query.q.trim()}%`
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
        like(customers.nationalId, term),
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Sort
  const sortField = query.sortBy === 'phone'
    ? customers.phone
    : query.sortBy === 'registrationDate'
      ? customers.registrationDate
      : customers.name   // default: name

  const orderFn = query.sortDir === 'asc' ? asc : desc
  // Default: name ascending
  const orderClause = query.sortDir === 'desc' ? orderFn(sortField) : asc(customers.name)

  // Count total
  const [{ total }] = await db
    .select({ total: count() })
    .from(customers)
    .where(whereClause)

  // Fetch page
  const rows = await db
    .select()
    .from(customers)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(perPage)
    .offset(offset)

  return {
    data: rows.map(toListDTO),
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

/**
 * Create a new customer.
 *
 * DEC-051: name and phone are required — validated here.
 * DEC-053: national_id uniqueness enforced via DB constraint; ConflictError on duplicate.
 * registration_date is system-generated = today.
 */
export async function createCustomer(data: CreateCustomerRequest): Promise<CustomerDTO> {
  // DEC-051: required field validation
  if (!data.name || !data.name.trim()) {
    throw new ValidationError('اسم العميل مطلوب')
  }
  if (!data.phone || !data.phone.trim()) {
    throw new ValidationError('رقم الهاتف مطلوب')
  }

  // Application-level length validation (mirrors DB column limits)
  if (data.name.trim().length > MAX_NAME_LENGTH) {
    throw new ValidationError(`اسم العميل لا يمكن أن يتجاوز ${MAX_NAME_LENGTH} حرفاً`)
  }
  if (data.phone.trim().length > MAX_PHONE_LENGTH) {
    throw new ValidationError(`رقم الهاتف لا يمكن أن يتجاوز ${MAX_PHONE_LENGTH} حرفاً`)
  }
  if (data.nationalId && data.nationalId.trim().length > MAX_NATIONAL_ID_LENGTH) {
    throw new ValidationError(`الرقم القومي لا يمكن أن يتجاوز ${MAX_NATIONAL_ID_LENGTH} حرفاً`)
  }

  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  try {
    const [result] = await db.insert(customers).values({
      name:             data.name.trim(),
      phone:            data.phone.trim(),
      nationalId:       data.nationalId?.trim() || null,
      registrationDate: new Date(today),
      notes:            data.notes?.trim() || null,
      isActive:         true,
    })

    const newCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, result.insertId))
      .limit(1)

    if (!newCustomer[0]) throw new Error('Failed to retrieve created customer')

    return toProfileDTO(newCustomer[0])
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Get a single customer by ID.
 * DEC-056: Returns full national_id (profile endpoint).
 */
export async function getCustomer(id: number): Promise<CustomerDTO> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!row) {
    throw new NotFoundError(`العميل رقم ${id} غير موجود`)
  }

  return toProfileDTO(row)
}

/**
 * Update a customer's editable fields.
 * is_active is NOT editable via this method — use deactivateCustomer / activateCustomer.
 */
export async function updateCustomer(id: number, data: UpdateCustomerRequest): Promise<CustomerDTO> {
  // Verify the customer exists
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!existing[0]) {
    throw new NotFoundError(`العميل رقم ${id} غير موجود`)
  }

  const updateValues: Partial<typeof customers.$inferInsert> = {}

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new ValidationError('اسم العميل لا يمكن أن يكون فارغاً')
    if (data.name.trim().length > MAX_NAME_LENGTH) {
      throw new ValidationError(`اسم العميل لا يمكن أن يتجاوز ${MAX_NAME_LENGTH} حرفاً`)
    }
    updateValues.name = data.name.trim()
  }
  if (data.phone !== undefined) {
    if (!data.phone.trim()) throw new ValidationError('رقم الهاتف لا يمكن أن يكون فارغاً')
    if (data.phone.trim().length > MAX_PHONE_LENGTH) {
      throw new ValidationError(`رقم الهاتف لا يمكن أن يتجاوز ${MAX_PHONE_LENGTH} حرفاً`)
    }
    updateValues.phone = data.phone.trim()
  }
  if (data.nationalId !== undefined) {
    const trimmedNid = data.nationalId?.trim() || null
    if (trimmedNid && trimmedNid.length > MAX_NATIONAL_ID_LENGTH) {
      throw new ValidationError(`الرقم القومي لا يمكن أن يتجاوز ${MAX_NATIONAL_ID_LENGTH} حرفاً`)
    }
    updateValues.nationalId = trimmedNid
  }
  if (data.notes !== undefined) {
    updateValues.notes = data.notes?.trim() || null
  }

  if (Object.keys(updateValues).length === 0) {
    // Nothing to update — return current state
    return toProfileDTO(existing[0])
  }

  try {
    await db
      .update(customers)
      .set(updateValues)
      .where(eq(customers.id, id))
  } catch (err) {
    handleDbError(err)
  }

  const [updated] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  return toProfileDTO(updated!)
}

/**
 * Soft-deactivate a customer (DEC-052).
 * Idempotent: deactivating an already-inactive customer succeeds silently.
 */
export async function deactivateCustomer(id: number): Promise<CustomerDTO> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!row) {
    throw new NotFoundError(`العميل رقم ${id} غير موجود`)
  }

  if (row.isActive) {
    await db
      .update(customers)
      .set({ isActive: false })
      .where(eq(customers.id, id))
  }

  const [updated] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  return toProfileDTO(updated!)
}

/**
 * Reactivate a previously deactivated customer (DEC-052).
 * Idempotent: activating an already-active customer succeeds silently.
 */
export async function activateCustomer(id: number): Promise<CustomerDTO> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!row) {
    throw new NotFoundError(`العميل رقم ${id} غير موجود`)
  }

  if (!row.isActive) {
    await db
      .update(customers)
      .set({ isActive: true })
      .where(eq(customers.id, id))
  }

  const [updated] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  return toProfileDTO(updated!)
}
