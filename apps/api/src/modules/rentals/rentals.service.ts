/**
 * KOSHK SKATE ERP — Rentals Service
 * Phase 05 — Rental POS Core
 *
 * Business rules enforced here:
 *   - BR-01/BR-02/BR-03: skate must be status='available' (enforced inside TX with FOR UPDATE)
 *   - BR-04/BR-26: hourly rate comes from settings table — never hardcoded
 *   - BR-05/BR-20: expected_end_at = started_at + duration_minutes (stored)
 *   - BR-11/BR-17: price_per_hour and rental_amount are immutable snapshots
 *   - BR-15/DEC-065: raw_amount = hourlyRate × durationMinutes / 60
 *   - BR-16/DEC-067: rental_amount = Math.round(raw_amount) — nearest whole EGP
 *   - BR-21/DEC-062: rental_code = RN-NNNNN, based on auto-increment PK, UNIQUE
 *   - BR-22/DEC-064: persisted statuses: active | returned | cancelled ONLY
 *   - BR-23/DEC-066: operational statuses computed server-side — never stored
 *   - BR-24/DEC-052: deactivated customers cannot start a new rental
 *   - BR-29/DEC-060: no payment recording in Phase 05
 *   - BR-31/DEC-066: ending_soon threshold = 5 minutes
 *   - BR-32/DEC-068: initial rate = 120 EGP (from settings, not hardcoded)
 *   - BR-10/DEC-063: concurrency — FOR UPDATE lock on skate inside transaction
 *
 * Rental Code Concurrency Strategy (DEC-062, F-05 remediation):
 *   Previous: MAX+1 from rental_code inside TX.
 *   Problem:  Two concurrent inserts for DIFFERENT skates both read the same MAX
 *             before either commits → UNIQUE constraint collision → one valid
 *             rental fails.
 *
 *   Current: INSERT with a temporary placeholder code, then UPDATE the code
 *            to 'RN-' + padStart(insertId, 5) in the same transaction.
 *            The auto-increment PK is assigned by InnoDB and is globally unique
 *            even across concurrent transactions — no two inserts ever share an
 *            insertId. This guarantees:
 *              • Sequential order (by creation time via auto-increment)
 *              • Never reused (PK is never recycled)
 *              • UNIQUE constraint still enforced (no duplicates possible)
 *              • DEC-062 format preserved: RN-NNNNN
 *
 * Same-skate concurrency (TC-RENT-20):
 *   startRental() uses a raw MySQL connection with:
 *     BEGIN; SELECT ... FOR UPDATE; INSERT; UPDATE code; UPDATE skate; COMMIT;
 *   The FOR UPDATE row lock on the skate prevents two cashiers from renting
 *   the same skate simultaneously.
 */

import { eq, sql, and, gte, lte, count, asc, desc } from 'drizzle-orm'
import { pool } from '../../db/connection.js'
import { db } from '../../db/connection.js'
import { rentals, ENDING_SOON_THRESHOLD_MINUTES } from '../../db/schema/rentals.js'
import { skates } from '../../db/schema/skates.js'
import { customers } from '../../db/schema/customers.js'
import { users } from '../../db/schema/users.js'
import { settings } from '../../db/schema/settings.js'
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from '../../utils/errors.js'
import type {
  RentalDTO,
  ActiveRentalDTO,
  StartRentalRequest,
  ListRentalsQuery,
  PaginatedRentals,
  PricePreviewDTO,
  CustomerRentalHistoryItem,
  PaginatedCustomerRentals,
  RentalSkateInfo,
  RentalCustomerInfo,
  RentalCashierInfo,
} from './rentals.types.js'
import type { RentalStatus, RentalOperationalStatus } from '../../db/schema/rentals.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Masks national_id per DEC-056 (duplicated from customers.types to avoid cross-module import) */
function maskNationalId(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 4) return value
  return '*'.repeat(value.length - 4) + value.slice(-4)
}

function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : String(d)
}

function isoDateNotNull(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : String(d)
}

/**
 * DEC-065, DEC-067: Calculate rental amount.
 * raw = hourlyRate × durationMinutes / 60
 * rental_amount = Math.round(raw)  — nearest whole EGP, .5 rounds up
 */
function calculateRentalAmount(hourlyRate: number, durationMinutes: number): number {
  const raw = (hourlyRate * durationMinutes) / 60
  return Math.round(raw)
}

/**
 * DEC-066: Compute server-side operational status.
 * Threshold: ENDING_SOON_THRESHOLD_MINUTES (5 minutes)
 *
 * remaining_time > 5 min  → normal
 * remaining_time <= 5 AND > 0  → ending_soon
 * NOW() > expected_end_at      → overdue
 */
function computeOperationalStatus(
  expectedEndAt: Date | string,
  nowMs: number,
): { operationalStatus: RentalOperationalStatus; remainingMinutes: number } {
  const endMs = expectedEndAt instanceof Date
    ? expectedEndAt.getTime()
    : new Date(isoDateNotNull(expectedEndAt)).getTime()

  const diffMs = endMs - nowMs
  const diffMinutes = diffMs / 60000  // signed: negative = overdue

  if (diffMinutes <= 0) {
    return { operationalStatus: 'overdue', remainingMinutes: 0 }
  }

  const remainingMinutes = Math.ceil(diffMinutes) // round up for display
  if (remainingMinutes <= ENDING_SOON_THRESHOLD_MINUTES) {
    return { operationalStatus: 'ending_soon', remainingMinutes }
  }

  return { operationalStatus: 'normal', remainingMinutes }
}

/**
 * Read the current configured hourly rate from the settings table.
 * DEC-061, DEC-068: Must be read at runtime — never hardcoded.
 * Throws BusinessRuleError if the key is missing (PRICING_CONFIG_MISSING).
 */
async function readHourlyRate(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'rental_hourly_rate'))
    .limit(1)

  if (!row) {
    throw new BusinessRuleError(
      'إعدادات التسعير غير متوفرة',
      'PRICING_CONFIG_MISSING',
    )
  }

  const rate = parseFloat(row.value)
  if (!isFinite(rate) || rate <= 0) {
    throw new BusinessRuleError(
      'إعدادات التسعير غير صالحة',
      'PRICING_CONFIG_MISSING',
    )
  }

  return rate
}

// ---------------------------------------------------------------------------
// DTO mappers — raw join rows to typed DTOs
// ---------------------------------------------------------------------------

interface RawRentalRow {
  id: number
  rentalCode: string
  skateId: number
  customerId: number
  cashierId: number
  shiftId: number | null
  durationMinutes: number
  pricePerHour: string | number
  rentalAmount: string | number
  startedAt: Date | string
  expectedEndAt: Date | string
  returnedAt: Date | string | null
  status: RentalStatus
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  // joined fields
  skateCode?: string
  skateSize?: string
  skateType?: string | null
  customerName?: string
  customerPhone?: string
  customerNationalId?: string | null
  cashierName?: string
}

function rawToDTO(row: RawRentalRow): RentalDTO {
  const skate: RentalSkateInfo = {
    id:        row.skateId,
    skateCode: row.skateCode ?? '',
    size:      row.skateSize ?? '',
    type:      row.skateType ?? null,
  }
  const customer: RentalCustomerInfo = {
    id:               row.customerId,
    name:             row.customerName ?? '',
    phone:            row.customerPhone ?? '',
    nationalIdMasked: maskNationalId(row.customerNationalId),
  }
  const cashier: RentalCashierInfo = {
    id:   row.cashierId,
    name: row.cashierName ?? '',
  }

  return {
    id:              row.id,
    rentalCode:      row.rentalCode,
    skate,
    customer,
    cashier,
    shiftId:         row.shiftId,
    durationMinutes: row.durationMinutes,
    pricePerHour:    parseFloat(String(row.pricePerHour)),
    rentalAmount:    parseFloat(String(row.rentalAmount)),
    startedAt:       isoDateNotNull(row.startedAt),
    expectedEndAt:   isoDateNotNull(row.expectedEndAt),
    returnedAt:      isoDate(row.returnedAt),
    status:          row.status,
    notes:           row.notes,
    createdAt:       isoDateNotNull(row.createdAt),
    updatedAt:       isoDateNotNull(row.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// Joined query helper — all rental columns plus related entity fields
// ---------------------------------------------------------------------------

async function fetchRentalsJoined(whereClause?: ReturnType<typeof and>): Promise<RawRentalRow[]> {
  const rows = await db
    .select({
      id:              rentals.id,
      rentalCode:      rentals.rentalCode,
      skateId:         rentals.skateId,
      customerId:      rentals.customerId,
      cashierId:       rentals.cashierId,
      shiftId:         rentals.shiftId,
      durationMinutes: rentals.durationMinutes,
      pricePerHour:    rentals.pricePerHour,
      rentalAmount:    rentals.rentalAmount,
      startedAt:       rentals.startedAt,
      expectedEndAt:   rentals.expectedEndAt,
      returnedAt:      rentals.returnedAt,
      status:          rentals.status,
      notes:           rentals.notes,
      createdAt:       rentals.createdAt,
      updatedAt:       rentals.updatedAt,
      // Joined
      skateCode:           skates.skateCode,
      skateSize:           skates.size,
      skateType:           skates.type,
      customerName:        customers.name,
      customerPhone:       customers.phone,
      customerNationalId:  customers.nationalId,
      cashierName:         users.name,
    })
    .from(rentals)
    .leftJoin(skates,    eq(rentals.skateId,    skates.id))
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(users,     eq(rentals.cashierId,  users.id))
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))

  return rows as RawRentalRow[]
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Rental POS configuration (F-06 — DEC-069).
 * Returns the configured hourly rate and standard duration options.
 * Backed by the settings table — not hardcoded in application code.
 * Used by GET /api/v1/rentals/config.
 *
 * No Settings management UI is created in Phase 05.
 * This endpoint is Rental-module-specific and read-only.
 */
export async function getRentalConfig(): Promise<{
  pricePerHour:    number
  durationOptions: number[]
}> {
  const [rateSetting, durationsSetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'rental_hourly_rate')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'rental_duration_options')).limit(1),
  ])

  if (!rateSetting[0]) {
    throw new BusinessRuleError('إعدادات التسعير غير متوفرة', 'PRICING_CONFIG_MISSING')
  }

  const pricePerHour = parseFloat(rateSetting[0].value)
  if (!isFinite(pricePerHour) || pricePerHour <= 0) {
    throw new BusinessRuleError('إعدادات التسعير غير صالحة', 'PRICING_CONFIG_MISSING')
  }

  let durationOptions: number[] = [15, 30, 45, 60, 90]  // fallback (should always be seeded)
  if (durationsSetting[0]) {
    try {
      const parsed = JSON.parse(durationsSetting[0].value)
      if (Array.isArray(parsed) && parsed.every(x => typeof x === 'number' && x > 0)) {
        durationOptions = parsed
      }
    } catch {
      // Malformed JSON — use fallback (already set above)
    }
  }

  return { pricePerHour, durationOptions }
}

/**
 * Calculate rental price preview (server-authoritative).
 * DEC-065, DEC-067: formula + rounding.
 * No rental record is created.
 */
export async function calculatePrice(durationMinutes: number): Promise<PricePreviewDTO> {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new ValidationError('مدة الإيجار غير صالحة', { durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر' })
  }

  const hourlyRate = await readHourlyRate()
  const rentalAmount = calculateRentalAmount(hourlyRate, durationMinutes)

  return { durationMinutes, pricePerHour: hourlyRate, rentalAmount }
}

/**
 * Start a new rental (Rental POS — primary workflow).
 *
 * ATOMIC TRANSACTION with FOR UPDATE locking on the skate row.
 * Prevents double-booking under concurrent requests.
 *
 * Steps (BR-01 through BR-32):
 *  1. Validate inputs
 *  2. Verify skate exists (outside TX — for better error messaging)
 *  3. Verify customer exists and is active (outside TX)
 *  4. Read hourly rate from settings (outside TX)
 *  5. BEGIN TRANSACTION
 *  6. SELECT skate FOR UPDATE (row-level lock)
 *  7. Verify skate status = 'available' (authoritative check inside TX)
 *  8. Calculate rental_amount (DEC-065, DEC-067)
 *  9. Generate rental_code via MAX+1 (inside TX)
 * 10. Capture server start time
 * 11. Calculate expected_end_at
 * 12. INSERT rental record
 * 13. UPDATE skate status = 'rented'
 * 14. COMMIT
 */
export async function startRental(
  cashierId: number,
  data: StartRentalRequest,
): Promise<RentalDTO> {
  // --- Input validation ---
  if (!data.skateId || !Number.isInteger(data.skateId) || data.skateId <= 0) {
    throw new ValidationError('معرف الزلاجة مطلوب')
  }
  if (!data.customerId || !Number.isInteger(data.customerId) || data.customerId <= 0) {
    throw new ValidationError('معرف العميل مطلوب')
  }
  if (!data.durationMinutes || !Number.isInteger(data.durationMinutes) || data.durationMinutes <= 0) {
    throw new ValidationError('مدة الإيجار غير صالحة', { durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر' })
  }
  if (data.notes && data.notes.length > 1000) {
    throw new ValidationError('الملاحظات تتجاوز الحد الأقصى 1000 حرف')
  }

  // --- Pre-flight: skate exists (application-layer check for better UX) ---
  const [skateRow] = await db.select().from(skates).where(eq(skates.id, data.skateId)).limit(1)
  if (!skateRow) throw new NotFoundError('الزلاجة غير موجودة')

  // --- Pre-flight: customer exists and is active ---
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, data.customerId)).limit(1)
  if (!customerRow) throw new NotFoundError('العميل غير موجود')
  if (!customerRow.isActive) {
    throw new BusinessRuleError('لا يمكن إنشاء إيجار لعميل معطل', 'CUSTOMER_INACTIVE')
  }

  // --- Read hourly rate from settings (DEC-061, DEC-068) ---
  const hourlyRate = await readHourlyRate()

  // --- Atomic transaction with FOR UPDATE locking ---
  const connection = await pool.getConnection()
  let newRentalId: number

  try {
    await connection.beginTransaction()

    // Lock the skate row — prevents concurrent cashiers from renting same skate
    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [data.skateId],
    )

    const lockedSkate = skateRows[0]
    if (!lockedSkate || lockedSkate.status !== 'available') {
      await connection.rollback()
      throw new BusinessRuleError('الزلاجة غير متاحة للاستئجار', 'SKATE_NOT_AVAILABLE')
    }

    // Calculate rental amount (DEC-065, DEC-067)
    const rentalAmount = calculateRentalAmount(hourlyRate, data.durationMinutes)

    // Capture server time (BR-19)
    const startedAt = new Date()
    const expectedEndAt = new Date(startedAt.getTime() + data.durationMinutes * 60000)

    // INSERT rental record with a temporary placeholder code.
    // The final rental_code is derived from the auto-increment insertId (DEC-062, F-05).
    // A temporary unique placeholder prevents the UNIQUE constraint from rejecting the row
    // before we can compute the real code from the insertId.
    const tempCode = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const [insertResult] = await connection.execute<any>(
      `INSERT INTO rentals
        (rental_code, skate_id, customer_id, cashier_id, shift_id, duration_minutes,
         price_per_hour, rental_amount, started_at, expected_end_at, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [
        tempCode,
        data.skateId,
        data.customerId,
        cashierId,
        data.durationMinutes,
        hourlyRate.toFixed(2),
        rentalAmount.toFixed(2),
        startedAt,
        expectedEndAt,
        data.notes ?? null,
      ],
    )

    newRentalId = insertResult.insertId

    // Derive the final rental code from the auto-increment PK (DEC-062, F-05).
    // insertId is globally unique — no two concurrent inserts ever share one.
    // Format: RN-NNNNN (minimum 5 digits, no maximum).
    const rentalCode = 'RN-' + String(newRentalId).padStart(5, '0')

    // Update the placeholder code to the final code in the same transaction
    await connection.execute(
      'UPDATE rentals SET rental_code = ? WHERE id = ?',
      [rentalCode, newRentalId],
    )

    // Transition skate status: available → rented (DEC-031, BR-18)
    await connection.execute(
      "UPDATE skates SET status = 'rented', updated_at = NOW() WHERE id = ?",
      [data.skateId],
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore rollback error */ }
    throw err
  } finally {
    connection.release()
  }

  // Fetch and return the created rental with joins
  const rows = await fetchRentalsJoined(eq(rentals.id, newRentalId))
  if (!rows[0]) throw new Error('Failed to retrieve created rental')

  return rawToDTO(rows[0])
}

/**
 * Get active rentals with server-computed operational status.
 * DEC-064, DEC-066: operational status is computed — never stored.
 */
export async function getActiveRentals(): Promise<ActiveRentalDTO[]> {
  const rows = await fetchRentalsJoined(eq(rentals.status, 'active'))

  const nowMs = Date.now()

  return rows.map(row => {
    const dto = rawToDTO(row)
    const { operationalStatus, remainingMinutes } = computeOperationalStatus(row.expectedEndAt, nowMs)
    return { ...dto, operationalStatus, remainingMinutes }
  })
}

/**
 * List rentals with pagination and filters.
 */
export async function listRentals(query: ListRentalsQuery): Promise<PaginatedRentals> {
  const page    = Math.max(1, parseInt(query.page    ?? '1',  10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset  = (page - 1) * perPage

  const conditions: ReturnType<typeof eq>[] = []

  if (query.status && ['active', 'returned', 'cancelled'].includes(query.status)) {
    conditions.push(eq(rentals.status, query.status as RentalStatus))
  }
  if (query.skateId)    conditions.push(eq(rentals.skateId,    parseInt(query.skateId, 10)))
  if (query.customerId) conditions.push(eq(rentals.customerId, parseInt(query.customerId, 10)))
  if (query.cashierId)  conditions.push(eq(rentals.cashierId,  parseInt(query.cashierId, 10)))
  if (query.from)       conditions.push(gte(rentals.startedAt, new Date(query.from)))
  if (query.to)         conditions.push(lte(rentals.startedAt, new Date(query.to)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(rentals)
    .where(whereClause)

  const rows = await db
    .select({
      id:              rentals.id,
      rentalCode:      rentals.rentalCode,
      skateId:         rentals.skateId,
      customerId:      rentals.customerId,
      cashierId:       rentals.cashierId,
      shiftId:         rentals.shiftId,
      durationMinutes: rentals.durationMinutes,
      pricePerHour:    rentals.pricePerHour,
      rentalAmount:    rentals.rentalAmount,
      startedAt:       rentals.startedAt,
      expectedEndAt:   rentals.expectedEndAt,
      returnedAt:      rentals.returnedAt,
      status:          rentals.status,
      notes:           rentals.notes,
      createdAt:       rentals.createdAt,
      updatedAt:       rentals.updatedAt,
      skateCode:           skates.skateCode,
      skateSize:           skates.size,
      skateType:           skates.type,
      customerName:        customers.name,
      customerPhone:       customers.phone,
      customerNationalId:  customers.nationalId,
      cashierName:         users.name,
    })
    .from(rentals)
    .leftJoin(skates,    eq(rentals.skateId,    skates.id))
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(users,     eq(rentals.cashierId,  users.id))
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  return {
    data: (rows as RawRentalRow[]).map(rawToDTO),
    pagination: {
      page,
      perPage,
      total:      Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

/**
 * Get a single rental by ID with full joins.
 */
export async function getRental(id: number): Promise<RentalDTO> {
  const rows = await fetchRentalsJoined(eq(rentals.id, id))
  if (!rows[0]) throw new NotFoundError(`الإيجار رقم ${id} غير موجود`)
  return rawToDTO(rows[0])
}

/**
 * Get rental history for a specific customer (DEC-055).
 * Paginated, ordered by started_at DESC.
 */
export async function getCustomerRentals(
  customerId: number,
  query: { page?: string; perPage?: string },
): Promise<PaginatedCustomerRentals> {
  // Verify customer exists
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customerRow) throw new NotFoundError(`العميل رقم ${customerId} غير موجود`)

  const page    = Math.max(1, parseInt(query.page    ?? '1',  10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset  = (page - 1) * perPage

  const [{ total }] = await db
    .select({ total: count() })
    .from(rentals)
    .where(eq(rentals.customerId, customerId))

  const rows = await db
    .select({
      id:              rentals.id,
      rentalCode:      rentals.rentalCode,
      skateId:         rentals.skateId,
      durationMinutes: rentals.durationMinutes,
      rentalAmount:    rentals.rentalAmount,
      startedAt:       rentals.startedAt,
      expectedEndAt:   rentals.expectedEndAt,
      returnedAt:      rentals.returnedAt,
      status:          rentals.status,
      skateCode:  skates.skateCode,
      skateSize:  skates.size,
      skateType:  skates.type,
    })
    .from(rentals)
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .where(eq(rentals.customerId, customerId))
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  const data: CustomerRentalHistoryItem[] = rows.map(row => ({
    id:              row.id,
    rentalCode:      row.rentalCode,
    skate: {
      id:        row.skateId,
      skateCode: (row as any).skateCode ?? '',
      size:      (row as any).skateSize ?? '',
      type:      (row as any).skateType ?? null,
    },
    durationMinutes: row.durationMinutes,
    rentalAmount:    parseFloat(String(row.rentalAmount)),
    startedAt:       isoDateNotNull(row.startedAt),
    expectedEndAt:   isoDateNotNull(row.expectedEndAt),
    returnedAt:      isoDate(row.returnedAt),
    status:          row.status,
  }))

  return {
    data,
    pagination: {
      page,
      perPage,
      total:      Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}
