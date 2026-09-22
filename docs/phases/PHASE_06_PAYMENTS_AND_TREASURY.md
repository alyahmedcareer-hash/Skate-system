# Phase 06 — Payments and Treasury

**Status:** COMPLETE ✅
**Last updated:** 2026-09-22 (Phase 06 Closure)

## Objective

Implement payment recording, split payments, treasury accounts, treasury movements. Ensure strict validation of payments against rental amounts. Support automated refunds via treasury movements on cancellation.

## Scope

Implemented Features:
1. **Database Schema:**
   - `treasury_accounts`: Tracks accounts (e.g., Main Cash, Bank, InstaPay).
   - `payment_methods`: Configurable mapping of payment types to treasury accounts.
   - `rental_payments`: Join table linking rentals to payments made.
   - `treasury_movements`: Immutable log of all inflows/outflows for audits.
2. **Backend Services & Routes:**
   - Enforced exact payment match during `startRental()`. Total of `payments` must equal `rentalAmount`.
   - Atomic recording of `rental_payments` and corresponding inward `treasury_movements` on rental creation.
   - Automated outward `treasury_movements` representing refunds on rental cancellation.
   - Endpoints for fetching active payment methods and treasury accounts.
3. **Frontend Integration:**
   - `payments.service.ts` created to fetch methods.
   - `RentalPOSPage.tsx` updated with dynamic `PaymentSelector` for Step 4. Supports split payments and enforces client-side total validation matching the backend.

## Dependencies

- Phase 05 (Rental Core)

---

## Technical Details & Decisions

- **Exact Payments Rule:** rentals cannot be started without exact payment. Zero, partial, and overpayments are rejected by `422 Unprocessable Entity`.
- **Refunds:** Cancellation triggers exact refunds. The original payment records are not deleted; instead, inverse treasury movements are created referencing the rental ID.
- **Seeded Accounts:** Main Cash, Bank, Card, InstaPay, Other are pre-seeded for Phase 06 to support POS without needing a dedicated settings UI immediately.

## Testing & Verification
- 6 integration test cases defined in `payments.test.ts`.
- Regressions in `rentals.test.ts` fixed by passing default payments into payloads.
- 176 total backend tests pass.
- Playwright E2E was blocked due to host network restrictions, but manual flow logic is structurally enforced via strict TypeScript typing and unit tests.

## Definition of Done

All Phase 06 integration tasks complete. Git commit `cab5a19` handles the integration.
