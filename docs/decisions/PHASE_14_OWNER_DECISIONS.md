# Phase 14 Owner Decisions

This document outlines the business and technical decisions that must be resolved by the product owner before implementing Phase 14 (Invoices & Printing).

## 1. Invoice Numbering Format
**Context:** Currently, rentals have a `rentalCode` (e.g., `RN-00123`) and sales have a `saleCode`. 
**Decision Required:** 
- Should the printed invoice simply use the `rentalCode`/`saleCode` as the Invoice ID? 
- Or should the system generate a centralized, unified `invoice_number` sequence (e.g., `INV-000001`) that spans both rentals and sales for accounting compliance?

## 2. Invoice Persistence Strategy
**Context:** Invoices can either be generated dynamically on-the-fly from existing transaction data, or explicitly saved as immutable records (HTML/PDF/JSON snapshot) in a new `invoices` table.
**Decision Required:** 
- Is on-the-fly generation acceptable, or does the business require immutable point-in-time snapshots of every generated invoice?

## 3. Printer Integration Architecture
**Context:** The application is a Cloud ERP accessed via browser. Web browsers cannot easily send raw hardware commands to local USB/Network thermal printers.
**Decision Required:** 
- **Option A (Browser Print):** Use standard browser printing (`window.print()`) with a specially formatted 80mm CSS layout. (Easiest, no extra hardware agent needed, but shows browser print dialog).
- **Option B (Hardware Bridge):** Use raw ESC/POS commands sent to a local hardware agent/proxy running on the cashier's machine. (Seamless, no dialog, but requires installing software on client machines).

## 4. Barcode Format and Data
**Context:** The spec requires a barcode on the invoice.
**Decision Required:**
- What data should the invoice barcode encode? The `rentalCode`? A specialized verification URL?
- Should we standardize on CODE128 (most common for 1D scanners) or QR Codes?

## 5. Printing Automation
**Context:** Cashiers perform many transactions quickly.
**Decision Required:**
- Should the system *automatically* trigger the print dialog/command upon a successful rental start or return, or should the cashier always click a "Print" button manually?

## 6. Refunds & Cancellations
**Context:** When a rental is cancelled or a sale refunded, money is returned.
**Decision Required:**
- Does the system need to print a formal "Credit Note" or "Cancellation Receipt"?
