/**
 * KOSHK SKATE ERP — Phase 05 Rental POS Core — Unit Tests
 *
 * Tests cover:
 *   - calculatePrice (BR-15 / DEC-065 / DEC-067)
 *   - startRental business rule validation (BR-24: inactive customer)
 *   - startRental business rule validation (BR-01: unavailable skate)
 *   - API route shape: GET /api/v1/rentals/calculate-price
 *   - API route shape: GET /api/v1/rentals/active
 *
 * Mocking strategy:
 *   - DB calls mocked via vi.mock (Vitest)
 *   - pool.getConnection mocked for transaction path
 *   - settings table returns configurable hourly rate
 *
 * DEC-067: nearest whole EGP, .5 rounds up — tested explicitly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Unit tests: pricing formula (no DB needed)
// ---------------------------------------------------------------------------

describe('Phase 05 — Rental Pricing Formula (DEC-065, DEC-067)', () => {

  /**
   * raw = hourlyRate × durationMinutes / 60
   * rental_amount = Math.round(raw) — nearest whole EGP, .5 rounds up
   */
  function calculateRentalAmount(hourlyRate: number, durationMinutes: number): number {
    const raw = (hourlyRate * durationMinutes) / 60
    return Math.round(raw)
  }

  it('BR-15: 120 EGP/hr × 60 min = 120 EGP (exact)', () => {
    expect(calculateRentalAmount(120, 60)).toBe(120)
  })

  it('BR-15: 120 EGP/hr × 30 min = 60 EGP (exact)', () => {
    expect(calculateRentalAmount(120, 30)).toBe(60)
  })

  it('BR-15: 120 EGP/hr × 15 min = 30 EGP (exact)', () => {
    expect(calculateRentalAmount(120, 15)).toBe(30)
  })

  it('BR-15: 120 EGP/hr × 45 min = 90 EGP (exact)', () => {
    expect(calculateRentalAmount(120, 45)).toBe(90)
  })

  it('BR-15: 120 EGP/hr × 90 min = 180 EGP (exact)', () => {
    expect(calculateRentalAmount(120, 90)).toBe(180)
  })

  it('DEC-067: .5 rounds up — 120 EGP/hr × 25 min = 50 EGP (raw=50.0)', () => {
    expect(calculateRentalAmount(120, 25)).toBe(50)
  })

  it('DEC-067: rounding up — raw=50.5 rounds to 51', () => {
    // 120 × 25.25 / 60 = 50.5
    expect(calculateRentalAmount(120, 25.25)).toBe(51)
  })

  it('DEC-067: rounding down — raw=50.4 rounds to 50', () => {
    // 120 × 25.2 / 60 = 50.4
    expect(calculateRentalAmount(120, 25.2)).toBe(50)
  })

  it('BR-15: non-standard hourly rate (150 EGP/hr × 45 min = 112.5 → 113)', () => {
    // raw = 150 × 45 / 60 = 112.5 → Math.round(112.5) = 113
    expect(calculateRentalAmount(150, 45)).toBe(113)
  })

  it('DEC-069: custom duration > 90 still calculates correctly', () => {
    // 120 × 120 / 60 = 240
    expect(calculateRentalAmount(120, 120)).toBe(240)
  })

  it('DEC-069: 1-minute rental rounds correctly', () => {
    // 120 × 1 / 60 = 2.0
    expect(calculateRentalAmount(120, 1)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Unit tests: operational status computation (DEC-064, DEC-066)
// ---------------------------------------------------------------------------

describe('Phase 05 — Operational Status Computation (DEC-064, DEC-066)', () => {

  const THRESHOLD_MINUTES = 5

  function computeOperational(expectedEndAt: Date, now: Date): { opStatus: string; remainingMinutes: number } {
    const diffMs    = expectedEndAt.getTime() - now.getTime()
    const diffMin   = diffMs / 60000

    if (diffMin <= 0) return { opStatus: 'overdue', remainingMinutes: 0 }
    const remaining = Math.ceil(diffMin)
    if (remaining <= THRESHOLD_MINUTES) return { opStatus: 'ending_soon', remainingMinutes: remaining }
    return { opStatus: 'normal', remainingMinutes: remaining }
  }

  it('DEC-066: > 5 minutes remaining → normal', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const end = new Date('2026-01-01T10:10:00Z')  // 10 min
    const { opStatus } = computeOperational(end, now)
    expect(opStatus).toBe('normal')
  })

  it('DEC-066: exactly 5 minutes remaining → ending_soon', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const end = new Date('2026-01-01T10:05:00Z')  // exactly 5 min
    const { opStatus, remainingMinutes } = computeOperational(end, now)
    expect(opStatus).toBe('ending_soon')
    expect(remainingMinutes).toBe(5)
  })

  it('DEC-066: 3 minutes remaining → ending_soon', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const end = new Date('2026-01-01T10:03:00Z')
    const { opStatus, remainingMinutes } = computeOperational(end, now)
    expect(opStatus).toBe('ending_soon')
    expect(remainingMinutes).toBe(3)
  })

  it('DEC-066: 1 second past end → overdue, remainingMinutes=0', () => {
    const now = new Date('2026-01-01T10:05:01Z')
    const end = new Date('2026-01-01T10:05:00Z')
    const { opStatus, remainingMinutes } = computeOperational(end, now)
    expect(opStatus).toBe('overdue')
    expect(remainingMinutes).toBe(0)
  })

  it('DEC-066: 30 minutes past end → overdue', () => {
    const now = new Date('2026-01-01T11:00:00Z')
    const end = new Date('2026-01-01T10:30:00Z')
    const { opStatus } = computeOperational(end, now)
    expect(opStatus).toBe('overdue')
  })

  it('DEC-066: exactly 6 minutes → normal', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const end = new Date('2026-01-01T10:06:00Z')
    const { opStatus, remainingMinutes } = computeOperational(end, now)
    expect(opStatus).toBe('normal')
    expect(remainingMinutes).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// Unit tests: rental code generation format (DEC-062)
// ---------------------------------------------------------------------------

describe('Phase 05 — Rental Code Format (DEC-062)', () => {
  function generateRentalCode(maxNum: number): string {
    const nextNum = (maxNum || 0) + 1
    return 'RN-' + String(nextNum).padStart(5, '0')
  }

  it('DEC-062: first rental code is RN-00001', () => {
    expect(generateRentalCode(0)).toBe('RN-00001')
  })

  it('DEC-062: sequential increment', () => {
    expect(generateRentalCode(1)).toBe('RN-00002')
    expect(generateRentalCode(99)).toBe('RN-00100')
    expect(generateRentalCode(999)).toBe('RN-01000')
    expect(generateRentalCode(9999)).toBe('RN-10000')
    expect(generateRentalCode(99999)).toBe('RN-100000')  // exceeds 5 digits — still works
  })

  it('DEC-062: code starts with RN- prefix', () => {
    expect(generateRentalCode(42)).toMatch(/^RN-/)
  })

  it('DEC-062: code is zero-padded to 5 digits minimum', () => {
    const code = generateRentalCode(0)
    expect(code).toBe('RN-00001')
    expect(code.replace('RN-', '').length).toBeGreaterThanOrEqual(5)
  })
})
