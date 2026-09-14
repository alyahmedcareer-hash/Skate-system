# Phase 04 — Customers Module

**Phase:** 04  
**Name:** Customers Module  
**Status:** PLANNING — PENDING OWNER APPROVAL  
**Last updated:** 2026-09-14 (Governance Remediation — planning structure established per Rule 16)

> [!IMPORTANT]
> Phase 04 implementation is BLOCKED until the owner approves the full business/product
> specification for this phase. Implementation MUST NOT begin without an approved written spec.
> See Rule 16 (Documentation-First Development) in AI_AGENT_RULES.md.

---

## Status

| Field | Value |
|---|---|
| Gate status | PLANNING — Owner approval required before implementation |
| Depends on | Phase 02 (Auth + RBAC — COMPLETE ✅) |
| Blocks | Phase 05 (Rental POS — requires customer records) |

---

## Objective

Implement customer management: customer records, search, profile view.  
The exact scope, fields, permissions, and behaviors are to be defined by the owner during Phase 04 planning.

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).

Phase 04 MUST inherit all of the following without reinvention:

- **KOSHK Visual Design Reference** — source of brand identity
- **DESIGN_SYSTEM.md** — approved color tokens, typography, spacing, radius, shadows
- **COMPONENT_LIBRARY.md** — approved reusable component APIs
- **All approved UI governance rules** (UI-001 through UI-011)
- **Approved RTL behavior** (DEC-001)
- **Approved accessibility rules** (DESIGN_SYSTEM.md §11)
- **Approved responsive rules** (DESIGN_SYSTEM.md §16)
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved Badge status API** (DEC-043)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)

Before creating any new UI component, check `COMPONENT_LIBRARY.md` first.  
Expected reusable components for Phase 04: `Button`, `Input`, `Select`, `Textarea`, `SearchBar`, `DataTable`, `Badge`, `Modal`, `ConfirmDialog`, `EmptyState`, `Pagination`, `Alert`, `Toast`.

Any deviation from the above requires explicit owner approval and a DECISION_LOG.md entry.

---

## Owner Decisions Required Before Implementation

The following decisions must be made by the owner and formally recorded in DECISION_LOG.md before Phase 04 implementation begins:

### Customer Data Model
- [ ] What fields are required? (name, phone, national ID, address, notes — confirm each)
- [ ] Is National ID stored? If so: plaintext, masked, or hashed?
- [ ] Is phone number validation required? What format?
- [ ] Are there other identity fields required?

### Customer Status
- [ ] Is there a customer status concept in Phase 04 (e.g., active / blocked / inactive)?
- [ ] If yes — what are the status values and what Badge color maps to each?

### Customer Search
- [ ] Which fields are searchable? (name, phone, national ID — confirm each)
- [ ] Is fuzzy search required or exact-match only?

### Permissions
- [ ] Provide the complete list of `customers.*` permissions required
- [ ] Which roles get which permissions by default?

### Customer Deletion / Archiving
- [ ] Can customers be deleted? Under what conditions?
- [ ] Business spec: must not delete a customer with rental history. Confirm strategy: soft delete, archive, or hard delete with constraint?

### Rental History on Customer Profile
- [ ] Should the customer profile show rental history in Phase 04?
- [ ] Or is rental history deferred to Phase 05 when rentals exist?

### IconButton Component (SYS-002)
- [ ] Customer row actions (Edit / Delete / View) are the first real use case for a shared `<IconButton>`.
- [ ] Approve the IconButton API before Phase 04 implementation creates it.

---

## Phase Lifecycle (Rule 16 — Documentation-First)

```
DISCOVERY → OWNER DECISIONS → BUSINESS RULES → UX/UI DESIGN
    → TECHNICAL DESIGN → OWNER APPROVAL → IMPLEMENTATION
    → VERIFICATION → DOCUMENTATION → PHASE 04 FINAL GATE → COMPLETE
```

---

## Source References

| Source | Authority |
|---|---|
| `Skate_Rental_ERP_Master_Business_Product_Specification.md` | Business requirements |
| `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md` | Visual design |
| `docs/design/DESIGN_SYSTEM.md` | Design token system |
| `docs/design/COMPONENT_LIBRARY.md` | Reusable components |
| `docs/00-governance/AI_AGENT_RULES.md` | Agent behavior rules |
| `docs/00-governance/DEFINITION_OF_DONE.md` | Completion criteria |
| `docs/decisions/DECISION_LOG.md` | Owner decisions |

---

## Planned API Routes (Target — to be confirmed during planning)

```
GET    /api/customers        — list customers (paginated, searchable)
POST   /api/customers        — create customer
GET    /api/customers/:id    — get customer profile
PUT    /api/customers/:id    — update customer
DELETE /api/customers/:id    — delete/archive (requires permission)
```

---

## Definition of Done

All items in `docs/00-governance/DEFINITION_OF_DONE.md` must be satisfied before this phase is COMPLETED.

Additionally:
- All Owner Decision items above are resolved and recorded in DECISION_LOG.md
- Customer permissions are defined, seeded, and enforced server-side
- All pages pass RTL + mobile verification
- Test suite passes with Phase 04 tests added
- TypeScript build: 0 errors | Production build: clean

---

*Last updated: 2026-09-14 (Governance Remediation — planning structure per Rule 16)*  
*Status: PLANNING — PENDING OWNER APPROVAL*

