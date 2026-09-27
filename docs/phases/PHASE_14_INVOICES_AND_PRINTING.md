# Phase 14 — Invoices and Printing

**Status:** PLANNED
**Last updated:** 2026-09-14 (Design System Governance Alignment — DESIGN SYSTEM INHERITANCE added per UI-011)

## Objective

Implement invoice generation, barcode, print support, printer configuration.

## Dependencies

Phases 05 and 11

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).
> This phase inherits the current approved KOSHK design system.
> It MUST NOT introduce a separate visual language.

This phase inherits:

- **KOSHK Visual Design Reference** — brand identity
- **DESIGN_SYSTEM.md** — approved design tokens and UI standards
- **COMPONENT_LIBRARY.md** — approved reusable components
- **Approved UI Governance** (UI-001 through UI-011 — AI_AGENT_RULES.md)
- **Approved RTL behavior** (DEC-001)
- **Approved accessibility rules** (DESIGN_SYSTEM.md §11)
- **Approved responsive/mobile rules** (DESIGN_SYSTEM.md §16)
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved Badge status API** (DEC-043)
- **Approved typography** (Cairo, design-system.css §3)
- **Approved spacing and radius system** (design-system.css §4–5)
- **Approved motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library

### Reuse Before Creating

Before creating any new UI component:

1. Check `COMPONENT_LIBRARY.md`.
2. Check the existing implementation in `apps/web/src/components/ui/`.
3. Reuse an existing component when possible.
4. Extend an existing component when appropriate.
5. Create a new component only when the existing library cannot reasonably satisfy the requirement.
6. New components must follow the existing KOSHK Design System.
7. Genuinely reusable new components must be added to `COMPONENT_LIBRARY.md`.

### Design Authority

The authority order for UI decisions in this phase is:

1. Owner-approved KOSHK decisions
2. KOSHK Visual Design Reference
3. DESIGN_SYSTEM.md
4. COMPONENT_LIBRARY.md
5. Approved UI Governance (AI_AGENT_RULES.md)
6. Existing verified implementation
7. UI/UX Pro Max recommendations *(advisory only — cannot override higher authorities)*
8. AI assumptions *(lowest priority — must be escalated if significant)*

No deviation from a higher-level authority is permitted without explicit owner approval and a DECISION_LOG.md entry.

---

## 1. Objective
To implement professional invoicing and receipt printing for both Skate Rentals (Phase 05) and Product Sales (Phase 11). The system must support generating structured invoices containing transaction details, payment breakdowns, customer information, and a scannable barcode, optimized for standard 80mm thermal printers.

## 2. Scope
- **Invoice Generation:** Generate complete printable invoices for Rental Transactions (Start & Return) and Sales Transactions.
- **Unified Numbering:** Implement a centralized sequential invoice number system (e.g., `INV-000001`) spanning all transactions.
- **Print Optimization:** Create a frontend print layout specifically styled for 80mm thermal receipt printers (RTL/Arabic).
- **Configuration:** Allow Administrators to globally enable or disable invoice printing via the Settings module.
- **Automation:** Implement auto-print behavior immediately following successful transactions.
- **Configuration:** Allow Administrators to globally enable or disable invoice printing via the Settings module.
- **Integration:** Embed print triggers seamlessly within the Cashier's Rental POS and Sales POS workflows.

## 3. Out of Scope
- Direct hardware ESC/POS driver integration (assuming Browser Print unless decided otherwise).
- A4/A5 full-page invoice templates (only 80mm thermal roll format is in scope).
- Automated email/SMS delivery of invoices.
- Fiscal/Tax Authority integration.

## 4. Owner Decisions
*See `docs/decisions/PHASE_14_OWNER_DECISIONS.md` for full context.*
1. **Invoice Numbering:** **Decision: B** — Use a unified invoice number across rentals and sales.
2. **Persistence:** **Decision: A** — Generate invoices on-the-fly. No separate persisted invoice snapshot table at this stage.
3. **Printing Architecture:** **Decision: TBD** — Hardware not purchased. Design the printing layer so the provider can be replaced later.
4. **Barcode:** **Decision: NO BARCODE** — Explicit OWNER OVERRIDE of the original Master Business Specification. Printed invoices will not have barcodes.
5. **Printing Automation:** **Decision: A** — Auto-print after a successful transaction.
6. **Cancellations:** **Decision: A** — No separate Credit Note / cancellation receipt in Phase 14.

## 5. Technical Decisions
- **Printing Technology:** Implement an abstract `PrintProvider` interface on the frontend. The initial concrete implementation will use native browser printing (`window.print()`) combined with an invisible CSS `@media print` layout, keeping the system agnostic for future hardware bridges.
- **No Barcode Engine:** As per Owner Decision #4, no barcode generation library will be introduced.
- **Invoice Source Data:** Invoices will be generated dynamically by aggregating existing data from `rentals`, `sales`, `users`, `customers`, and `rental_payments` / `sale_payments`. 

## 6. Architecture / Modules
- **API `modules/invoices` (Optional):** A dedicated endpoint to fetch a compiled "print-ready" payload for a given transaction if frontend aggregation is too complex.
- **Web `components/printer`:** A set of React components dedicated strictly to rendering the print layout off-screen.

## 7. Database Changes
**DB Impact: REQUIRED**
- **Unified Sequences:** A new `sequences` table (or similar mechanism) must be created to track the centralized `invoice_number` sequence atomically across different transaction types.
- **Settings:** A new key `print_invoices_enabled` must be added to the `settings` table.
- *Note:* No `invoices` table is required because invoices are generated on-the-fly (Owner Decision #2).

## 8. API Changes
- `GET /api/v1/settings`: (Existing) Expose `print_invoices_enabled`.
- `PATCH /api/v1/settings`: (Existing) Update print toggle.
- `GET /api/v1/invoices/rental/:id`: (New) Aggregate all data needed for a rental invoice (rental data + customer + payments + cashier).
- `GET /api/v1/invoices/sale/:id`: (New) Aggregate all data needed for a sales invoice (sale data + items + payments + cashier).

## 9. Frontend Changes
- **Settings Screen:** Add a toggle to enable/disable printing.
- **Print Layout:** Create `InvoicePrintTemplate.tsx` optimized for 80mm (`width: 80mm`, `@page { margin: 0 }`).
- **POS Integration:** Implement the auto-print trigger upon successful Rental Start, Return, and Sales Checkout.
- **Print Provider Abstraction:** Encapsulate printing logic to easily swap out `window.print()` for an ESC/POS hardware bridge in the future.

## 10. RBAC
- **Invoices View:** Tied to `rentals.view` and `sales.view`.
- **Printer Configuration:** Requires `settings.update` (Administrator only).

## 11. Printing
- **Format:** 80mm Thermal Receipt.
- **Language:** Arabic (RTL).
- **Contents:** Store Header, Date/Time, Cashier Name, Customer Name, Unified Invoice Number, Line Items (Skate/Duration or Product/Qty), Subtotal, Late/Damage Fees (if applicable), Total, Payments by Method, Footer.

*(Note: Section 12 "Barcode" has been removed due to Owner Decision #4).*

## 13. Tests
- Unit tests for invoice data aggregation service.
- Integration tests for `GET /api/v1/invoices/*` endpoints.
- Integration tests for the atomic `invoice_number` sequence generator.
- Component tests ensuring the `@media print` CSS classes apply.

## 14. Verification
- Verify printer settings can be toggled and persist.
- Generate a Rental Start invoice and verify all data matches the DB.
- Generate a Rental Return invoice and verify Late Fees and Damage Charges appear.
- Generate a Sales invoice and verify items, quantities, and totals.
- Verify the auto-print sequence automatically triggers upon transaction success.
- Print to PDF and verify the 80mm layout is preserved without clipping.

## 15. Findings
*(To be populated during implementation)*

## 16. Risks
- **Browser Print Dialog:** Browser native print dialogs cannot be completely bypassed by default security policies, which adds an extra click for the cashier.
- **Margin Issues:** Default browser margins often ruin 80mm thermal prints; strict CSS overrides are required.

## 17. Definition of Done
- Printer setting exists and controls UI behavior.
- Rental start/return receipts generate automatically.
- Sales receipts generate automatically.
- Layout perfectly fits 80mm when printed via browser.
- Tests pass.

## 18. Implementation Plan
1. **DB Updates:** Create the `sequences` table for unified invoice numbering and seed settings.
2. **Data Aggregation:** Implement the backend services to fetch print-ready payloads.
3. **Print Layout:** Develop the hidden 80mm CSS layout and abstract `PrintProvider`.
4. **UI Integration:** Hook the auto-print triggers into Rental and Sales POS flows.
5. **Verification:** Test via Print-to-PDF and automated tests.
6. **Phase Closure.**

