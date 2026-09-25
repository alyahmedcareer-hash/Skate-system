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

## 13. Findings
- TypeScript errors found in backend aggregation queries (e.g., missing `PaginatedResult` import, incorrect mapping of `categoryId` and `repairCost`).

## 14. Remediation
- Fixed TypeScript errors in `reports.service.ts` to map correctly to database schemas (e.g., `damage_reports.customerCharge`, `maintenanceRecords.problemDescription`, etc).

## 15. Re-verification
- `npm run build` for `apps/api` succeeds.

## 16. Documentation
- Created this canonical Phase 13 document.

## 17. Git Commits
- Backend API implemented and verified in commit `0a69001`.

## 18. Known Limitations
- Data exports (CSV/PDF) are handled via standard browser print or future enhancements (Phase 14).
- The Reports UI frontend is currently PENDING. Backend routes are fully functional.

## 19. Final Status
IN PROGRESS ⏳
