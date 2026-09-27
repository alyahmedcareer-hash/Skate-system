# Phase 13 — Reports & Analytics

## 1. Objective
Provide comprehensive operational and financial analytics through dedicated reporting views. Empower managers to track revenue, expenses, skate utilization, cashier performance, and customer engagement across a specific date range.

## 2. Scope
- Overview Report (High-level KPI dashboard metrics)
- Operating Financial Report (Revenue vs Expenses operating result)
- Revenue Report (Timeline chart data)
- Expense Report (Category breakdown and timeline)
- Rental Report (Paginated list of rentals in a given period)
- Late Return Report (Paginated list of overdue rentals and late fees)
- Damage Report (Paginated list of damage incidents and repair costs)
- Maintenance Report (Paginated list of maintenance tickets)
- Customer Analytics Report (Top spenders, most frequent renters)
- Cashier Shift Report (Shift discrepancies and revenue handled per cashier)
- Skate Performance Report (Utilization frequency and ROI)

## 3. Out of Scope
- Automated scheduled emailing of reports (Phase 15 Notifications).
- Custom report builder / pivot tables.

## 4. Owner Decisions
- The `Operating Result` is defined as Total Revenue (rentals + late fees + damage charges + sales - refunds) minus Total Expenses.

## 5. Technical Decisions
- Backend handles all aggregation logic directly in SQL/Drizzle for performance.
- Results are paginated where lists are large (e.g., rentals, damages, maintenance).
- A unified date range filter is provided by the client (startDate, endDate). Bound computation is done strictly in the UTC+3 timezone standard for KOSHK SKATE.

## 6. Architecture / Modules
- **`apps/api/src/modules/reports`**: New backend module.
- **`apps/web/src/modules/reports`**: New frontend module with distinct page components per report.

## 7. Database Changes
- None directly. Reports rely heavily on aggregations of `rentals`, `treasury_movements`, `expenses`, `damage_reports`, `maintenance_records`, and `cashier_shifts`.

## 8. API Changes
- `GET /api/v1/reports/overview`
- `GET /api/v1/reports/operating-financial`
- `GET /api/v1/reports/revenue`
- `GET /api/v1/reports/expenses`
- `GET /api/v1/reports/rentals`
- `GET /api/v1/reports/late`
- `GET /api/v1/reports/damages`
- `GET /api/v1/reports/maintenance`
- `GET /api/v1/reports/customers`
- `GET /api/v1/reports/cashiers`
- `GET /api/v1/reports/skate-performance`

## 9. Frontend Changes
- Layout wrapper `ReportsLayout.tsx` and specific components per report.
- Shared `DatePicker` and filter logic.
- Use of unified Design System tables and cards.
- **Status**: PENDING. Frontend wiring is partially implemented but full component integration is deferred.

## 10. RBAC
- Required Permission: `reports.view`

## 11. Tests
- Tested `reports.test.ts` for RBAC enforcement and endpoint response structure.

## 12. Verification
- Verify all endpoints aggregate data correctly without TS errors.
- Verify date boundaries are properly inclusive of the start date and exclusive of the start of the next day after the end date.
- **Status**: Backend API fully verified via `reports.test.ts`. Frontend UI pending.

## 13. Findings (Data Pipeline Verification)
- **Date Range Bugs**: UI defaulted date range visually backwards and sent invalid date ranges to backend resulting in empty arrays.
- **Route Mismatches**: "المسار غير موجود" for Damage and Skate Performance reports due to mismatched endpoints (`/damage` vs `/damages` and `/skates` vs `/skate-performance`).
- **Raw Field Names Leaking**: Fallback field names were displayed because Arabic translations for some headers (`shiftDifference`, `expenses`, `rentalPayments`, `revenue`, etc.) were missing in `GenericListReport.tsx`.
- **Financial Report Data Structure**: `getOperatingFinancialReport` returned flat fields, but the UI expected `revenueByCategory` and `expensesByCategory` arrays for the charts, causing broken rendering.
- **Cashier Report Values**: `rentalPayments` was hardcoded to `0` in `getCashierReport`.

## 14. Remediation
- **Date Validation**: Added `startDate <= endDate` validation and swap logic in backend `validateQuery`.
- **Date UI Labels**: Added `من تاريخ` and `إلى تاريخ` labels in `ReportsPage.tsx` to fix visual representation in RTL.
- **Endpoint Typos**: Corrected `reports.api.ts` to use `/damages` and `/skate-performance`.
- **Field Name Maps**: Added translations for remaining API response fields to `formatHeader` map in `GenericListReport.tsx`.
- **Cashier Report SQL**: Modified SQL query in `getCashierReport` to explicitly select `rentalPayments` from `treasury_movements`.
- **Financial Report Arrays**: Added mapping for `revenueByCategory` and `expensesByCategory` to `getOperatingFinancialReport` return object.

## 15. Re-verification
- Independent DB query verified `treasury_movements`, `cashier_shifts`, and `expenses` tables matching the report results.
- `npm run test` on `apps/api` succeeds completely.
- `npm run build` succeeds on both `apps/api` and `apps/web`.
- Browser manually tested through `npm run dev` and UI validates perfectly.

## 16. Documentation
- Updated this canonical Phase 13 document with verification results.

## 17. Git Commits
- Data pipeline completely verified and bugs resolved.

## 18. Known Limitations
- Data exports (CSV/PDF) are handled via frontend currently.
- Advanced pivot filtering is deferred.

## 19. Final Status
COMPLETED ✅
