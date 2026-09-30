# Phase 33 Discovery Report — Production Readiness Gaps
Date: 2026-09-30
Auditor: Antigravity
Repository: KOSHK SKATE ERP

## 1. Executive Summary
A comprehensive discovery audit was performed on the current repository state (following Phase 32). The goal was to identify the highest-value production-readiness gaps across architecture, financial integrity, access control, and user experience. 

The audit confirms that previously completed phases (Accounting, Treasury reconciliation, Rental/refunds, Reservations, Maintenance, Dashboard, Notifications, and Audit logging) are structurally present and stable.

However, three significant production-readiness gaps remain.

## 2. Identified Production-Readiness Gaps

### Gap 1: System Actor / Background Task Architecture (Critical Audit Integrity Issue)
**Status:** REMEDIATED (PHASE 33 SYSTEM ACTOR INTEGRITY)
**Context:** 
During automated business processes (e.g., `lazyExpireReservations` in `reservations.service.ts` which automatically cancels expired reservations when a user queries the list), actions are performed by the system itself, not an active user.
**The Problem:** 
The `audit_logs` database schema enforces `user_id` as a strict, non-nullable foreign key referencing the `users` table. When `reservations.service.ts` attempts to log a cancellation without a `userId` (or passes `undefined`), the database rejects the insert with `ER_NO_DEFAULT_FOR_FIELD`. Because Phase 32 made audit logging non-blocking, these failures are silently caught and dropped (visible only as `stderr` output during test runs). Furthermore, race conditions existed where concurrent requests could execute cancellation without transactional atomic guarantees, and audit failures blocked subsequent audit logs.
**Impact:** 
System-initiated actions were entirely un-audited, representing a compliance hole, and susceptible to duplicate logging or business state corruption.
**Remediation (Phase 33 Fixes):** 
1. **System Actor Registration:** Implemented a formal "System Actor" identity (`system@koshkskate.internal`) seeded idempotently with `isSystemAccount: true`. Normal logins for this identity are rigorously blocked.
2. **Race Condition & Concurrency Guard:** `lazyExpireReservations` has been overhauled to apply atomic state transitions. It explicitly transitions candidates `ONLY` if they are strictly still eligible (`status IN ('pending', 'confirmed') AND reserved_until <= NOW()`). 
3. **Duplicate Audit Protection:** Audit events are now strictly gated behind `result.affectedRows > 0`. If a concurrent request races and is beaten, the database's native optimistic locking causes `affectedRows === 0`, ensuring exactly one state change and exactly one audit event is logged.
4. **Audit Failure Isolation:** Implemented loop-level `try/catch` isolation. Audit persistence failures for candidate A will no longer abort candidate B. Business transitions remain strictly non-reliant on audit success.
5. **Test Coverage:** Extensive isolated tests (`system-actor.test.ts`) were added to guarantee isolation across System Actor distinguishability, login blocking, atomic race condition safety, duplicate guards, and audit failure isolation.
**Remaining Limitations:**
- `lazyExpireReservations` performs non-transactional `SELECT` then candidate-by-candidate `UPDATE`. While the `UPDATE` is atomic and safe, high volumes of expired reservations may incur N+1 performance constraints.

### Gap 2: Invoices History & Retrieval Viewer
**Status:** MISSING FRONTEND CAPABILITY
**Context:** 
The system actively generates unique invoice numbers (e.g., `INV-000001`) via sequence generation for every rental and sale. The backend endpoints (`/api/v1/invoices/*`) and the frontend `InvoicePrintTemplate` component successfully support auto-printing immediately after a transaction.
**The Problem:** 
There is no UI page, route, or module to view historical invoices. If a customer returns later and requests a copy of an invoice, or if an administrator needs to investigate a past invoice by its `INV-XXXXX` code, it is impossible without raw database access.
**Proposed Remediation:** 
Implement a `/invoices` route in the frontend with search, filtering (by customer, date, or number), and the ability to trigger the existing print routines.

### Gap 3: Treasury Ledger & Historical Shifts Viewer
**Status:** MISSING FRONTEND MANAGEMENT CAPABILITY
**Context:** 
Phase 12 (Treasury & Shifts) allows cashiers to open and close their current active shift in the `/treasury` route, and the backend perfectly enforces `treasury_movements` double-entry logic and balance updates across `rentals`, `sales`, `expenses`, and `damage`. The `Reports` module successfully aggregates this data into financial summaries.
**The Problem:** 
There is no administrative interface to view the raw Treasury Ledger (individual `treasury_movements` rows) or to inspect historical `cashier_shifts` and their specific discrepancies. Financial audits require line-by-line verification which is currently impossible through the UI.
**Proposed Remediation:** 
Expand the Treasury or Reports module to include a "Treasury Ledger Viewer" and a "Shift History" data table for administrators.

## 3. Recommendation for Phase 33 Scope
Phase 33 should officially be designated as **"System Architecture & Financial Ledger Completion"** encompassing the three gaps above.

**Phase 33 Goals:**
1. Fix the System Actor audit gap by implementing a dedicated System User and updating automated services to use it.
2. Build the Invoices History UI.
3. Build the Treasury Ledger and Shift History UI.

No temporary files remain. The repository is clean and ready for Phase 33 commencement.
