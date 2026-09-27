# Phase 14 Owner Decisions

This document outlines the business and technical decisions resolved by the product owner before implementing Phase 14 (Invoices & Printing).

## 1. Invoice Numbering Format
**Decision: B — Use a unified invoice number.**
The system will generate a centralized, unified sequence for invoices that spans across both rentals and sales, rather than just reusing the individual transaction codes (`RN-XXXXX` / `SL-XXXXX`).

## 2. Invoice Persistence Strategy
**Decision: A — Generate invoices on-the-fly.**
Invoices will be compiled dynamically from existing transaction and payment records. There will be no separate database table storing immutable snapshots of generated invoices.

## 3. Printer Integration Architecture
**Decision: TBD — Pluggable Provider Architecture.**
The specific printer model has not been purchased yet. The system must NOT implement any specific hardware integration or ESC/POS bridging at this stage. Instead, the printing layer must be designed in an abstract/pluggable manner so the actual provider implementation can be finalized and swapped in once the hardware is acquired.

## 4. Barcode Format and Data
**Decision: NO BARCODE ON PRINTED INVOICES (OWNER OVERRIDE).**
*Important Note:* The original Master Business Specification explicitly required barcodes on printed invoices. This decision is a formal OWNER OVERRIDE to remove that requirement from the scope of Phase 14. No barcode will be rendered or printed on receipts.

## 5. Printing Automation
**Decision: A — Auto-print.**
The system will automatically trigger the print action immediately following a successful transaction (e.g., successful rental start, successful sale checkout, or successful rental return). The cashier will not be required to manually click a print button for standard workflows.

## 6. Refunds & Cancellations
**Decision: A — No Cancellation Receipts.**
Phase 14 will not include or support printing separate "Credit Notes" or cancellation receipts when transactions are voided or refunded.
