# Phase 04 — Customers Module

**Phase:** 04
**Name:** Customers Module
**Status:** IN PROGRESS — OWNER APPROVED
**Last updated:** 2026-09-15 (Owner approved; implementation started)

---

## Status

| Field | Value |
|---|---|
| Gate status | APPROVED — Implementation in progress |
| Owner decisions | DEC-051 through DEC-058 (all resolved 2026-09-15) |
| Depends on | Phase 02 (Auth + RBAC — COMPLETE ✅), Phase 03.5 (Design System — COMPLETE ✅) |
| Blocks | Phase 05 (Rental POS — requires `customers` table + API) |

---

## Objective

Implement a fully functional Customer Management module for the KOSHK SKATE ERP:

- Customer record creation, viewing, editing, and soft-deactivation
- Searchable, paginated customer list
- Customer profile page (basic info only — Phase 04 scope)
- Server-side RBAC enforced permissions
- Full KOSHK Design System inheritance — no new visual language

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).

Phase 04 inherits all of the following without reinvention:

- **KOSHK Visual Design Reference** — brand identity
- **DESIGN_SYSTEM.md** — approved color tokens, typography, spacing, radius, shadows
- **COMPONENT_LIBRARY.md** — approved reusable component APIs
- **All approved UI governance rules** (UI-001 through UI-011)
- **RTL behavior** (DEC-001)
- **Accessibility rules** (DESIGN_SYSTEM.md §11)
- **Responsive rules** (DESIGN_SYSTEM.md §16)
- **Semantic color system** (DEC-034, DEC-041)
- **Badge status API** (DEC-043 + DEC-058 extension for `active`/`inactive`)
- **Currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)
- **Phase inheritance rules** — DEC-040

---

## Approved Owner Decisions

All 8 Phase 04 Owner Decisions are resolved. Full rationale in DECISION_LOG.md.

| Decision | Outcome | Decision ID |
|---|---|---|
| OD-04-001: Required fields | Name + Phone required; National ID optional | DEC-051 |
| OD-04-002: Customer status | Soft-deactivate via `is_active`; reactivatable | DEC-052 |
| OD-04-003: National ID uniqueness | UNIQUE (nullable) | DEC-053 |
| OD-04-004: Phone uniqueness | NOT UNIQUE | DEC-054 |
| OD-04-005: Rental history in Phase 04 | DEFERRED — Phase 05+ | DEC-055 |
| OD-04-006: National ID display | Masked in list; full in profile | DEC-056 |
| OD-04-007: IconButton API | Approved API — see DEC-057 | DEC-057 |
| OD-04-008: Default permissions | Admin: all 4; Cashier: view/create/edit | DEC-058 |

---

## Business Rules

1. **Name** is required (NOT NULL, max 255 chars).
2. **Phone** is required (NOT NULL, max 20 chars). NOT UNIQUE — families may share phones (DEC-054).
3. **National ID** is optional (nullable). UNIQUE when provided — two customers may not share the same National ID (DEC-053). If a duplicate is submitted, return 409 with Arabic error message.
4. **Registration date** is system-generated at creation (= today's date). The cashier/user does not input it.
5. **Notes** are optional free-text.
6. **Soft-deactivation only** — no hard delete. `is_active = false` hides the customer from Rental POS search. Customer is reactivatable (DEC-052).
7. **National ID is PII** — masked in the customer list response; full value only in the profile endpoint (DEC-056).
8. **Rental history is DEFERRED** — the customer profile in Phase 04 shows only basic customer data. No stats, no stub data, no placeholder APIs for future data (DEC-055).
9. **Search** — searchable by name, phone, and National ID via a unified `q` query parameter (server-side LIKE search).

---

## Database Schema

**File:** `apps/api/src/db/schema/customers.ts`

```typescript
export const customers = mysqlTable('customers', {
  id:               int('id').primaryKey().autoincrement(),
  name:             varchar('name', { length: 255 }).notNull(),
  phone:            varchar('phone', { length: 20 }).notNull(),
  nationalId:       varchar('national_id', { length: 50 }).unique(),  // DEC-053: nullable UNIQUE
  registrationDate: date('registration_date').notNull(),
  notes:            text('notes'),
  isActive:         boolean('is_active').notNull().default(true),     // DEC-052
  createdAt:        datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:        datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
})
```

**Indexes:** `national_id` (UNIQUE, nullable), `phone` (INDEX for search), `name` (INDEX for search).

**Schema delta from DATABASE_ARCHITECTURE.md:** `is_active` column added per DEC-052.

---

## API Routes

**Base path:** `/api/v1/customers`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/customers` | `customers.view` | List customers (paginated, searchable, default active-only) |
| `POST` | `/api/v1/customers` | `customers.create` | Create customer |
| `GET` | `/api/v1/customers/:id` | `customers.view` | Customer profile (full national_id) |
| `PUT` | `/api/v1/customers/:id` | `customers.edit` | Update customer |
| `POST` | `/api/v1/customers/:id/deactivate` | `customers.deactivate` | Soft-deactivate |
| `POST` | `/api/v1/customers/:id/activate` | `customers.deactivate` | Reactivate (same permission) |

**List query parameters:**
- `q` — search across name, phone, national_id (LIKE `%q%`)
- `page`, `perPage` — pagination (default: page=1, perPage=20)
- `sortBy`, `sortDir` — sorting (default: name ASC)
- `isActive` — `1` (active only, default), `0` (inactive only), `all` (all customers)

**List response DTO includes `national_id_masked` (not full `national_id`).**

---

## Permissions

| Permission Key | Arabic Label | Module |
|---|---|---|
| `customers.view` | عرض العملاء | customers |
| `customers.create` | إضافة عميل | customers |
| `customers.edit` | تعديل بيانات العميل | customers |
| `customers.deactivate` | تعطيل / تفعيل العميل | customers |

**Role defaults (DEC-058):**
- Administrator: all 4 permissions
- Cashier: `customers.view`, `customers.create`, `customers.edit`
- Maintenance Staff: none

---

## Frontend Pages

### `/customers` — Customers List

`apps/web/src/modules/customers/CustomersPage.tsx`

Layout:
```
┌──────────────────────────────────────────────────────────────────┐
│  العملاء                                     [+ إضافة عميل]      │
├──────────────────────────────────────────────────────────────────┤
│  [SearchBar: ابحث عن عميل بالاسم أو الهاتف أو الرقم القومي...] │
├──────────────────────────────────────────────────────────────────┤
│  DataTable:                                                       │
│  الاسم | الهاتف | الرقم القومي | تاريخ التسجيل | الحالة | إجراءات │
│  ─────────────────────────────────────────────────────────────── │
│  محمد علي | 01012345678 | ****1234 | 2026-09-15 | [نشط] | [✏][👁] │
├──────────────────────────────────────────────────────────────────┤
│  [Pagination]                                                     │
└──────────────────────────────────────────────────────────────────┘
```

- National ID column shows masked value (`****1234`) or `—` if absent
- Status column shows `<Badge status="active">نشط</Badge>` or `<Badge status="inactive">غير نشط</Badge>`
- Row actions: Edit (`IconButton` with `Pencil` icon), View Profile (`IconButton` with `Eye` icon)
- Deactivate action gated by `PermissionGate permission="customers.deactivate"`
- Create button gated by `PermissionGate permission="customers.create"`

### `/customers/:id` — Customer Profile

`apps/web/src/modules/customers/CustomerProfilePage.tsx`

Displays:
- Full name, phone, national_id (full value — not masked), registration date, status badge, notes
- Deactivate / Activate button (gated by `customers.deactivate` permission)
- Back button to `/customers`

**Phase 04 scope:** No rental history, no stats — that is Phase 05+.

---

## New Shared Component: IconButton (SYS-002)

**File:** `apps/web/src/components/ui/IconButton.tsx`

See DEC-057 for approved API. See `COMPONENT_LIBRARY.md` §4.19 for full specification.

---

## OUT OF SCOPE — Phase 04

These items are **permanently deferred** from Phase 04. Do NOT implement:

| Item | Owner Phase |
|---|---|
| Rental history on customer profile | Phase 05 |
| Rental count / total paid | Phase 05/06 |
| Late returns / damage history | Phase 08 |
| Reservation history | Phase 10 |
| Customer analytics report | Phase 13 |
| National ID audit logging | Phase 16 |

---

## Test Cases

**File:** `apps/api/src/tests/customers.test.ts`

| Test ID | Description |
|---|---|
| TC-CUST-01 | Create customer — all fields valid → 201 |
| TC-CUST-02 | Create customer — missing name → 400 |
| TC-CUST-03 | Create customer — missing phone → 400 |
| TC-CUST-04 | Create customer — duplicate National ID → 409 |
| TC-CUST-05 | List customers — paginated → 200 with pagination |
| TC-CUST-06 | List customers — search by name → matching results |
| TC-CUST-07 | List customers — search by phone → matching results |
| TC-CUST-08 | List customers — search by National ID → matching results |
| TC-CUST-09 | List customers — default excludes inactive |
| TC-CUST-10 | Get customer by ID → 200 with full national_id |
| TC-CUST-11 | Get customer — not found → 404 |
| TC-CUST-12 | Update customer — valid data → 200 |
| TC-CUST-13 | Update customer — not found → 404 |
| TC-CUST-14 | Deactivate customer — succeeds → is_active = false |
| TC-CUST-15 | Activate customer — succeeds → is_active = true |
| TC-CUST-16 | Activate already-active customer — idempotent → 200 |
| TC-CUST-RBAC-01 | No token → 401 |
| TC-CUST-RBAC-02 | Missing `customers.view` → 403 on GET list |
| TC-CUST-RBAC-03 | Missing `customers.create` → 403 on POST |
| TC-CUST-RBAC-04 | Missing `customers.edit` → 403 on PUT |
| TC-CUST-RBAC-05 | Missing `customers.deactivate` → 403 on deactivate |
| TC-CUST-RBAC-06 | Cashier with `customers.view` can list customers |
| TC-CUST-RBAC-07 | Cashier CANNOT deactivate (403) |
| TC-CUST-RBAC-08 | Administrator has all customer permissions |

---

## Definition of Done

All items in `docs/00-governance/DEFINITION_OF_DONE.md` must be satisfied plus:

- [x] All 8 Owner Decisions resolved and recorded in DECISION_LOG.md (DEC-051 to DEC-058)
- [ ] `customers` table created, migration applied and verified
- [ ] All backend service methods implemented and tested
- [ ] All API endpoints respond correctly (status codes, payload shape, permissions)
- [ ] All 24 test cases pass; existing test count not reduced
- [ ] `tsc -b` 0 errors; `npm run build` clean
- [ ] `CustomersPage.tsx` passes RTL + mobile verification
- [ ] `CustomerProfilePage.tsx` passes RTL + mobile verification
- [ ] `IconButton` component implemented, exported, and documented
- [ ] PROJECT_STATE.md, PROJECT_MAP.md, CHANGELOG.md updated
- [ ] DATABASE_ARCHITECTURE.md updated (customers marked IMPLEMENTED)
- [ ] COMPONENT_LIBRARY.md updated (IconButton specification added)
- [ ] Git commit: `feat(customers): implement customers module (Phase 04)`

---

*Last updated: 2026-09-15 (Full spec written — owner approved — implementation in progress) by AI Agent*
