# Changelog — KOSHK SKATE ERP

**Format:** Meaningful changes only. Not every trivial edit.

---

## [Unreleased]

### Phase 03.5 — Motion & Animation Audit AN-005, AN-006, AN-014 (2026-09-14)

**Motion & Animation UX Audit — 3 owner-approved findings implemented**

#### Fixed

- `Modal.tsx` (AN-005): Added exit animation via three-state lifecycle (`'hidden'` → `'visible'` → `'closing'` → `'hidden'`).
  - Desktop exit: `modal-exit` keyframe (opacity + `translateY(0→8px)`) at `--transition-slow` (300ms).
  - Mobile bottom-sheet exit: `modal-sheet-exit` keyframe (`translateY(0→100%)`) at `--transition-slow` (300ms).
  - Backdrop exit: `fadeOut` at `--transition-base` (200ms) — faster than container.
  - `pointer-events:none` on backdrop + container during closing — prevents mid-animation interaction.
  - Close button disabled during closing; Escape / backdrop-click ignored during closing.
  - Scroll lock persists through exit animation (released only on `'hidden'`).
  - All existing Modal APIs (`isOpen`, `onClose`, `title`, `children`, `footer`, `size`, `hideCloseButton`, `closeOnBackdrop`) preserved without change.
  - `fadeIn` / `fadeOut` keyframes now co-located in `Modal.tsx` `<style>` (alongside existing enter counterparts).

- `App.tsx` — AppShell (AN-006): Added `isDrawerClosing` state; mobile drawer now animates OUT before unmounting.
  - `handleMobileClose` guarded with `if (isDrawerClosing) return` to prevent double-trigger.
  - `drawer-slide-out` keyframe added (`translateX(0→100%)` — RTL correct) at `--transition-slow` (300ms).
  - Backdrop `fadeOut` at `--transition-base` (200ms).
  - `.sidebar-mobile-backdrop--closing` and `.sidebar-mobile-drawer--closing` CSS classes apply `pointer-events:none`.
  - Resize-to-desktop immediately clears both `mobileOpen` and `isDrawerClosing` (no exit animation on resize).
  - Focus restoration to hamburger button preserved; keyboard/focus/RTL/z-index behavior unchanged.
  - `isDrawerClosing` prop forwarded to `<Sidebar>` component via `SidebarProps`.

- `App.tsx` — Sidebar (AN-014): Navigation labels now fade correctly on sidebar collapse/expand.
  - `nav-item-label` and logout button label spans always rendered (removed `{!collapsed && ...}` conditional).
  - **Collapsing**: labels fade out immediately at `--transition-fast` (150ms, 0ms delay) — disappear before sidebar width shrinks.
  - **Expanding**: labels fade in with 150ms delay, then 150ms fade (`--transition-fast`) — appear after space has opened.
  - CSS handles entirely: `.nav-item-label { opacity:1; transition: opacity 150ms 150ms }` + `.sidebar--collapsed .nav-item-label { opacity:0; pointer-events:none; transition: opacity 150ms 0ms }`.
  - Clipping by `overflow:hidden` + `white-space:nowrap` on nav-item handles text hiding at collapsed width.

#### Deferred (explicitly — not in scope of this implementation)
- AN-012 (EmptyState entrance animation): Deferred — owner decision pending.
- AN-013 (Alert entrance animation): Deferred — owner decision pending.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors ✅
- Build: `npm run build` → 368KB (clean) ✅
- Browser — 10/10 manual tests PASS ✅:
  - Modal enter animation (desktop)
  - Modal exit animation via X button (desktop)
  - Modal exit animation via backdrop click (desktop)
  - Modal exit animation via Escape key (desktop)
  - Sidebar label fade on collapse and expand (desktop, AN-014)
  - Mobile drawer enter animation (RTL correct)
  - Mobile drawer exit animation (RTL correct, AN-006)
  - Mobile bottom-sheet enter + exit animation (AN-005)
  - No horizontal overflow at 375px
  - Focus restoration to hamburger after drawer close

---

### Phase 03.5 — Desktop UI Consistency Audit D-010 & D-012 (2026-09-14)

**Desktop UI Consistency Audit — D-010 and D-012 implemented**

#### Added
- `FormFields.tsx` (D-012): New `CheckboxField` shared form component — follows Input/Select/Textarea architecture and design tokens exactly.
  - Controlled checked state, label, disabled, error, helperText, RTL, keyboard, WCAG 2.5.5 44px touch target, CSS focus ring.
  - Custom visual box (18×18px, navy-800 filled + white SVG checkmark on checked) over hidden native `<input type="checkbox">`.
  - Focus ring via CSS sibling selector `.checkbox-native:focus-visible ~ .checkbox-box` — no JS required.
  - RTL: label at `order:0` (left in RTL), box at `order:1` (right in RTL) — standard Arabic checkbox convention.
  - Disabled state: `opacity: 0.6`, `cursor: not-allowed`.
  - Error state: danger-500 border on box, danger-text on label.
- `index.ts`: `CheckboxField` added to UI barrel export.

#### Fixed / Refactored
- `SkatesPage.tsx` (D-010): `SkateCard` outer raw `<div>` (8+ inline styles + JS `onMouseEnter`/`onMouseLeave` hover handlers) replaced with shared `<Card padding="compact" hover as="article">`.
  - `card--inactive` CSS class added in SkatesPage `<style>` for soft-disabled skate (opacity 0.65, muted bg).
  - JS hover handlers removed — design-system `card--hover` CSS (`translateY(-1px)`, `shadow-md`) now handles hover.
  - Inner `.skate-card-inner` flex wrapper with `height: 100%` added.
- `SkatesPage.tsx` (D-014, via D-010): Resolved — `height: 100%` on `.skate-card-inner` + CSS Grid stretch ensures equal card heights per row. JS `marginTop: auto` on edit button replaced by `.skate-card-inner .btn { margin-top: auto }` CSS rule.
- `UsersPage.tsx` (D-012): Role checkboxes in Create User modal replaced with `<CheckboxField>` per role. Raw `<label>` + raw `<input type="checkbox">` + inline styles removed. `<fieldset>`/`<legend>` used for semantic role-group.
- `FormFields.tsx` module header comment updated to reflect CheckboxField addition.
- User's label update preserved: purchase cost label changed from `ر.س` to `EGP` in both Create and Edit Skate modals.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 365KB bundle
- API tests: `npm test` → 34/34 PASS
- Browser: D-010 PASS at 375px, 430px, 768px, 1200px — cards consistent, equal height (D-014 resolved)
- Browser: D-012 PASS at 375px and 1200px — custom checkbox, checked state, RTL, touch target

### Phase 03.5 — Desktop UI Consistency Audit Fixes (2026-09-14)

**Desktop UI Consistency Audit — 9 findings resolved**

Owner decisions applied:
- Currency: EGP / `ج.م` symbol / Western Arabic numerals (`1,250 ج.م`)
- Badge API: semantic-status approach — `status="role"` + `status="system"` added to `Badge.tsx`

#### Added
- `apps/web/src/utils/currency.ts` (D-009): New `formatCurrency()` shared utility — EGP, Western Arabic numerals (`en-US` locale), `ج.م` suffix. Single source of truth for all ERP modules.
- `Badge.tsx`: New `BadgeStatus` values `'role'` (navy-50/navy-700) and `'system'` (maps to warning/gold variant) — approved semantic-status approach.
- `Badge.tsx`: New `BadgeVariant` `'role'` with `--color-navy-50` bg / `--color-navy-700` text.

#### Fixed
- `Button.tsx` (D-001): `btn-sm` `min-height` raised from 32px → 44px for WCAG 2.5.5 touch-target compliance on touch-capable desktops. Visual 32px height unchanged.
- `Modal.tsx` (D-003): `titleId` replaced `Math.random()` with React 18 `useId()` — stable, hydration-safe `aria-labelledby` relationship on all modals.
- `SkatesPage.tsx` (D-004): Removed inline `{ backgroundColor: gold-500, color: navy-900 }` override on EditSkateModal submit button. Standard `variant="primary"` (navy-800) now applies consistently.
- `SkatesPage.tsx` (D-009): Purchase cost display replaced `toLocaleString('ar-SA')` with `formatCurrency()` — now shows `1,000 ج.م` instead of Eastern Arabic numerals `١٬٠٠٠ ر.س`.
- `RolesPage.tsx` (D-005): System badge (`نظامي`) replaced raw `<span>` (non-token 0.65rem, gold-100/gold-600 inline) with `<Badge status="system">`.
- `RolesPage.tsx` (D-006): Permission count badge replaced raw `<span>` (navy-50/navy-700 inline) with `<Badge status="role">`.
- `RolesPage.tsx` (D-007): Permission chips replaced raw `<span>` (non-token 0.7rem, `border-radius: var(--radius-base)` — rectangular) with `<Badge variant="neutral">` — now pill-shaped (`--radius-full`) and `var(--font-size-xs)`.
- `UsersPage.tsx` (D-002): Role-name pills in desktop table AND mobile card list replaced raw `<span>` (inline navy-50/navy-700, inconsistent padding `1px`/`2px`) with `<Badge status="role">`.
- `UsersPage.tsx` (D-008): Desktop table empty state `<td>` plain text and mobile card empty state raw `<div>` both replaced with shared `<EmptyState icon={Users}>` component.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 361KB bundle
- API tests: `npm test` → 34/34 PASS
- Manual browser verification at 375px and 1200px — all 9 fixes PASS
- Currency: `1,000 ج.م` (Western numerals, correct symbol) ✅
- Badges: role pills navy-blue, system badge amber, permission chips pill-shaped ✅
- EditSkateModal save button: navy primary (no gold override) ✅
- btn-sm: touch target 44px min, visual size unchanged ✅
- Modal aria-labelledby stable across re-renders ✅

### Phase 03.5 — Mobile UX Audit Fixes (2026-09-14)

**Mobile UX Audit Bug Fixes — 7 items implemented from pre-Phase-04 audit report**

#### Fixed
- `SearchBar.tsx` (M-003): Added `@media (max-width: 479px) { min-width: 0; width: 100% }` so the search bar never causes horizontal overflow at 375–479px in the `.filters-row` column layout
- `App.tsx` (M-004): Topbar notification/bell button enlarged from 36×36px → 44×44px (WCAG 2.5.5 minimum touch target)
- `App.tsx` (M-017): Mobile drawer now has `role="dialog"` + `aria-modal="true"`. Added focus trap (Tab/Shift-Tab cycle within drawer, Escape closes and returns focus to hamburger). Hamburger button gets stable `id="topbar-mobile-menu-btn"` + ref for focus restoration. `AppShell` exposes `hamburgerRef` wired through both `Topbar` and `Sidebar`. Focus restored via `requestAnimationFrame` on all close paths (Escape, backdrop click, nav item click).
- `Modal.tsx` (M-005): Modal X close button enlarged from 36×36px → 44×44px (WCAG 2.5.5 minimum touch target)
- `RolesPage.tsx` (M-008): Header now uses shared `.page-header` / `.page-header-text` wrapper structure — consistent with `SkatesPage` and `UsersPage`. Removes inline style `marginBottom` in favor of the shared responsive pattern.
- `SkatesPage.tsx` (M-001/M-009/M-020): Removed local `Field` component and `inputStyle` inline style object. `CreateSkateModal` and `EditSkateModal` form fields now use shared `<Input>`, `<Select>`, `<Textarea>` from `FormFields.tsx`. Edit status select retains raw `<select className="field-control">` for DEC-031 disabled-option requirement (rented/reserved shown as read-only).
- `SkatesPage.tsx` (M-002/M-014): Filter-row status `<select>` inline `width:'auto'` removed. Now uses `className="field-control skates-filter-select"` with a dedicated CSS class (`flex: 0 0 auto; width: 160px` at desktop; `flex: none; width: 100%` at ≤479px). This fixes the CSS override priority issue where inline style prevented the `.filters-row` column mode from expanding the select.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 361KB bundle
- API tests: `npm test` → 34/34 PASS
- Manual browser verification at 375px, 390px, 430px, 768px, 1200px — all PASS
- Mobile drawer: Escape closes + focus restored to hamburger ✅, Tab trapped inside drawer ✅, backdrop click closes ✅
- Form controls: consistent 40px height in both Create and Edit modals ✅
- Filter row column mode: SearchBar + select both full-width at 375px ✅
- Roles page header: aligned with other pages ✅

### Phase 03.5 — Mobile / Phone View Review & Improvement (2026-09-11)

**Mobile UX Audit & Implementation — all responsive improvements**

#### Added
- `index.css`: `.page-container` shared utility (32px desktop / 16px mobile padding, responsive)
- `index.css`: `.page-header` shared utility (flex header, wraps to column on < 480px)
- `index.css`: `.page-header-title` / `.page-header-subtitle` typography utilities
- `index.css`: `.form-grid-2col` shared utility (2-col desktop, 1-col at < 640px) — OD-MOBILE-002
- `index.css`: `.skates-grid` shared utility (auto-fill cards, forced 1-col at < 480px)
- `index.css`: `.filters-row` shared utility (flex filters, column on < 480px)
- `UsersPage.tsx`: Mobile card-list view (< 640px) — OD-MOBILE-001 Option B. Avatar, name, email, roles, status, action per card. Desktop table kept for >= 640px.

#### Fixed
- `App.tsx`: Hamburger button touch target enlarged from 36×36px to 44×44px (WCAG compliant)
- `App.tsx`: Mobile drawer close button enlarged to 44×44px with focus-visible ring
- `App.tsx`: Topbar role badge protected with `max-width: 100px` + ellipsis overflow
- `App.tsx`: Desktop-only sidebar collapse toggle hidden inside mobile drawer (isMobile flag)
- `App.tsx`: Mobile drawer rebuilt inline to render correct nav without collapse toggle
- `App.tsx`: Safe-area-inset support added to topbar (`padding-top`, height calc)
- `App.tsx`: Safe-area-inset support added to sidebar mobile drawer (top/bottom/right padding)
- `App.tsx`: Mobile drawer close button gets `background-color` hover + focus-visible outline
- `App.tsx`: `PlaceholderPage` uses `.page-container` (16px padding on mobile)
- `Modal.tsx`: Bottom-sheet gets `max-height: 85dvh` + `overflow-y: auto` (scroll long forms)
- `Modal.tsx`: Bottom-sheet adds `padding-bottom: env(safe-area-inset-bottom)` for iOS home indicator
- `Modal.tsx`: Modal body padding reduces to 16px on mobile (< 640px)
- `Modal.tsx`: Modal footer stacks to full-width column on mobile for better thumb reach
- `SkatesPage.tsx`: Page container, page header, skates grid converted to shared CSS classes
- `SkatesPage.tsx`: All 5 inline 2-col form grids → `.form-grid-2col` (OD-MOBILE-002)
- `SkatesPage.tsx`: Filters row uses `.filters-row` (column layout on < 480px)
- `UsersPage.tsx`: Page container + page header converted to shared CSS classes
- `UsersPage.tsx`: Desktop table wrapped in `overflow-x: auto` container (M-010 resolved)
- `RolesPage.tsx`: Page container + title converted to shared CSS classes
- `RolesPage.tsx`: Role card header uses `flex-wrap` + `gap` to prevent overflow
- `RolesPage.tsx`: Role card permission badge gets `flex-shrink: 0`

#### Verification
- `npm run build` (apps/web): ✅ 0 TypeScript errors, 358KB bundle
- `npm test` (apps/api): ✅ 34/34 pass
- Breakpoints covered: 375px, 390px, 430px (mobile), 640px (mobile/tablet threshold), 768px (sidebar visible), 1280px (desktop)

---

## [Phase 03.5 Corrective Fix — Mobile Drawer Navigation] — 2026-09-14

### Bug Fixed

**Root Cause:** Z-index inversion in the mobile sidebar drawer. The `.sidebar-mobile-backdrop` was assigned `--z-overlay` (400) while `.sidebar-mobile-drawer` was assigned `--z-sidebar` (300). Because the backdrop was stacked *above* the drawer, every tap on a drawer nav item was intercepted by the backdrop's `onClick={onMobileClose}` handler, closing the drawer without ever triggering React Router navigation. The result: the drawer closed but the page did not change.

### Files Changed

- **`apps/web/src/App.tsx`** — CSS block inside `Sidebar` component:
  - `.sidebar-mobile-backdrop`: `z-index` changed from `var(--z-overlay)` (400) → `var(--z-sidebar)` (300)
  - `.sidebar-mobile-drawer`: `z-index` changed from `var(--z-sidebar)` (300) → `var(--z-modal)` (500)
  - Mobile media query for `.sidebar-desktop-wrapper`: added `pointer-events: none` alongside `display: none` as a defensive fix for iOS WebKit fixed-position stacking context edge cases

### Verification

- `npm run build` (apps/web): ✅ 0 TypeScript errors, clean bundle
- `npm test` (apps/api): ✅ 34/34 pass — zero regressions
- 375px (iPhone SE): nav tap navigates + drawer closes ✅, backdrop dismiss ✅, X button dismiss ✅
- 390px (iPhone 14): nav tap navigates + drawer closes ✅
- 430px (iPhone 14 Pro Max): nav tap navigates + drawer closes ✅
- 768px (tablet breakpoint): fixed desktop sidebar visible, direct nav works ✅
- 1200px (desktop): sidebar nav works, collapse toggle works ✅
- RTL: sidebar on right, text right-aligned ✅
- Console errors: none ✅

---

## [Phase 03.5 Corrective Fix] — 2026-09-11 — Sidebar Expand Control Restored

### Bug Fixed

**Root Cause:** When the sidebar collapsed to 64px, the `sidebar-header` flex row overflowed the available width. The header contained: logo (36px) + gap (12px) + collapse button (~24px) = ~72px — exceeding the 64px collapsed width. Because `.sidebar` has `overflow: hidden`, the toggle button was visually clipped and became inaccessible. The user could collapse the sidebar but had no visible or clickable control to expand it again.

### Files Changed

- **`apps/web/src/App.tsx`** — Sidebar corrective fix:
  - Added `sidebar-header--collapsed` CSS modifier class applied when sidebar is collapsed
  - Collapsed header switches to `flex-direction: column` with centered alignment and reduced padding so both the logo and toggle button fit within the 64px width
  - Added `sidebar-collapse-btn--collapsed` CSS modifier: resets `margin-inline-start: auto` to 0, gives the button a 36×36px rounded appearance matching the logo size for visual consistency
  - Fixed `margin-right: auto` → `margin-inline-start: auto` (correct logical property for RTL)
  - Added `title` attribute on toggle button for tooltip in both states
  - Toggle button remains fully visible and clickable in both expanded and collapsed states

### Verification

- `npm run build` (apps/web) → **0 TypeScript errors**, 353KB bundle ✅
- `npm test` (apps/api) → **34/34 PASS** — zero regressions ✅
- Sidebar collapse: ✅ works
- Sidebar expand (from collapsed): ✅ works — toggle button accessible
- Toggle visible in collapsed state: ✅ logo + toggle button both render in 64px column layout
- Active nav state in collapsed state: ✅ gold icon + indicator bar
- RTL layout: ✅ maintained
- Lucide icons: ✅ `PanelRightClose` / `PanelRightOpen` (no emoji)
- Mobile drawer: ✅ unaffected (separate code path)

---

## [Phase 03.5 Stage 1] — 2026-09-10 — Documentation & Governance Alignment

### Purpose
Establish the documentation and governance foundation for Phase 03.5 (ERP Design System & Interface Standardization). No application code was modified.

### Created — New Documentation

- **`docs/design/DESIGN_SYSTEM.md`** — Authoritative design system reference (v1.0): approved color tokens (brand + semantic), typography rules, spacing system, border radius, shadows, z-index, motion/animation rules, icon system (Lucide React), RTL rules, accessibility requirements, page anatomy, all component standards (17 components), sidebar behavior (expanded/collapsed/mobile), login layout, responsive breakpoints, visual density, UI governance rules UI-001 through UI-010, anti-pattern catalogue, new-screen checklist
- **`docs/design/COMPONENT_LIBRARY.md`** — Developer reference (v1.0): per-component specifications for all 17 shared UI components — purpose, expected props, important states, RTL considerations, accessibility expectations, and reuse rules
- **`docs/phases/PHASE_035_UI_DESIGN_SYSTEM.md`** — Complete phase specification: all four stages defined (documentation / implementation / testing / finalization), owner decisions, in/out of scope, deliverables, Definition of Done (42 checklist items), risk matrix, dependencies

### Updated — Governance Documents

- **`docs/00-governance/AI_AGENT_RULES.md`** (v1.0 → v2.0) — Added Rule 16 (Documentation-First Development), Rule 17 (Future Phase Inheritance), and all UI governance rules UI-001 through UI-010 (OD-004 APPROVED)
- **`docs/00-governance/DEFINITION_OF_DONE.md`** (v1.0 → v2.0) — UI/UX DoD section expanded with 15 design system compliance items: Lucide icons, token-only colors, shared components, no native dialogs, no inline style objects, Arabic text compliance, touch target minimums, and focus ring verification
- **`docs/00-governance/SOURCE_OF_TRUTH.md`** (v1.0 → v2.0) — Updated priority hierarchy to include `docs/design/DESIGN_SYSTEM.md` (priority 5.1), added Design Documents section to document register, corrected all architecture document statuses from INITIAL/PLANNED to ACTIVE, corrected operational document statuses, added Documentation-First Development section

### Updated — Operational Documents

- **`docs/PROJECT_STATE.md`** (v2.6 → v2.7) — Current phase updated to Phase 03.5 Stage 1; Phase 03.5 row added to phase table; documentation status table updated with all Phase 03.5 docs; design docs section added
- **`docs/PROJECT_MAP.md`** (v1.4 → v1.5) — Design directory entries added; component library paths planned; Phase 035 spec registered; note updated to reflect Phase 03 FINAL GATE PASSED and Phase 03.5 Stage 1 COMPLETE
- **`docs/decisions/DECISION_LOG.md`** — DEC-034 through DEC-040 recorded:
  - DEC-034: Semantic color tokens (OD-001)
  - DEC-035: Login page split-screen layout (OD-002)
  - DEC-036: Lucide React icon library (OD-003)
  - DEC-037: UI governance rules UI-001 through UI-010 (OD-004)
  - DEC-038: Sidebar expanded/collapsed/mobile behavior (OD-005)
  - DEC-039: Documentation-First Development lifecycle (governance)
  - DEC-040: Future phase inheritance rules (governance)

### Decisions Recorded

- **DEC-034** — Semantic color system: success `#58C89A`, warning `#F3B735`, danger `#ED4547`, neutral `#EEF1F5` — ACTIVE
- **DEC-035** — Login split-screen desktop + centered mobile — ACTIVE
- **DEC-036** — Lucide React as sole icon library — ACTIVE
- **DEC-037** — UI-001 through UI-010 governance rules — ACTIVE
- **DEC-038** — Sidebar: expanded + collapsible desktop; drawer mobile — ACTIVE
- **DEC-039** — Documentation-First Development lifecycle — ACTIVE
- **DEC-040** — Future phase inheritance — ACTIVE

### Verification

- No application source code was modified (confirmed)
- No database migrations were created (confirmed)
- No tests were modified (confirmed)
- No API behavior was changed (confirmed)
- All documentation files reviewed for internal consistency

### Stage Status

Stage 1: COMPLETE — awaiting owner review and approval to begin Stage 2 (Implementation)

## [v0.3.0 — FINAL GATE PASSED ✅] — 2026-09-10 — Phase 03: Skates / Asset Management

**Commit:** `f12c5b72cdb87a2a34866c252ce63b864b7e8fdc`
**Gate result:** APPROVED — all automated and manual checks passed.


### Added — Backend
- `apps/api/src/db/schema/skates.ts` — Drizzle schema for `skates` table (14 columns, 6-value status enum, 3-value condition enum)
- `apps/api/src/db/migrations/0001_glossy_darwin.sql` — Auto-generated Drizzle migration; creates `skates` table
- `apps/api/src/modules/skates/skates.types.ts` — Backend TypeScript types (SkateDTO, CreateSkateRequest, UpdateSkateRequest, etc.)
- `apps/api/src/modules/skates/skates.service.ts` — Business logic: `SK-NNN` auto-generation, status transition enforcement, QR/barcode auto-set, soft-disable, paginated list, history stub
- `apps/api/src/modules/skates/skates.routes.ts` — 6 Express routes (`/available` registered before `/:id` per spec)
- `apps/api/src/tests/skates.test.ts` — 16 integration tests (TC-SK-01 to TC-SK-16)

### Added — Frontend
- `apps/web/src/modules/skates/skates.service.ts` — Frontend types, status labels, badge colors, API wrappers
- `apps/web/src/modules/skates/SkatesPage.tsx` — Full management UI: card grid, status badges, search/filter, create modal, edit modal, loading/empty/error states (Arabic RTL)

### Modified
- `apps/api/src/db/schema/index.ts` — Added `skates.ts` export
- `apps/api/drizzle.config.ts` — Added `skates.ts` to schema array
- `apps/api/src/app.ts` — Mounted `/api/v1/skates` routes; updated health/index to Phase 03
- `apps/web/src/App.tsx` — Replaced `/skates` placeholder with `SkatesPage`; imported SkatesPage; updated phase badge to "المرحلة 03 ✓"

### Business Rules Enforced
- **DEC-030**: `skate_code` optional; auto-generated as `SK-NNN` (3-digit zero-padded MAX+1); never reused even after deactivation
- **DEC-031**: Admin API cannot set `status = rented` or `status = reserved` (HTTP 422 `SKATE_STATUS_NOT_ALLOWED`)
- **DEC-032**: `qr_code` and `barcode` auto-set to `skate_code` at creation; user-editable independently after creation
- **DEC-033**: Skate Type is a free-text input — no hardcoded dropdown values
- **DEC-009**: No hard delete — soft-disable via `is_active = false`; deactivated skates permanently hold their `skate_code`

### Verification
- API build: ✅ zero TypeScript errors
- Web build: ✅ zero TypeScript errors (Vite bundle 310 kB)
- Tests: ✅ 34/34 pass (16 Phase 03 + 18 Phase 02 — zero regressions)
- Migration: ✅ `skates` table created in `koshk_skate` DB

---

## [Phase 03 Pre-Implementation Final] — 2026-09-10 (Phase 03 Final Owner Decisions — All Implementation Details Resolved)

### Decisions Updated
- **`docs/decisions/DECISION_LOG.md`** — DEC-030 updated: `SK-NNN` format (3-digit zero-padded sequential), never reuse codes even after deactivation (IMPL-001)
- **`docs/decisions/DECISION_LOG.md`** — DEC-032 updated: `qr_code = skate_code`, `barcode = skate_code`; user-editable strings; no image rendering in Phase 03 (IMPL-002, IMPL-003)
- **`docs/decisions/DECISION_LOG.md`** — DEC-033 updated: Skate Type changed from "fixed dropdown" to **free-text input** — no hardcoded type list; Settings-configurable in future (IMPL-004)

### Documentation Updated
- **`docs/phases/PHASE_03_SKATES_MODULE.md`** — All IMPL items resolved: skate code algorithm (`SK-NNN`), QR/barcode payloads (`= skate_code`), type as free-text; TC-SK-02 updated to verify `SK-NNN` pattern; Unresolved Items section removed; status updated to READY FOR IMPLEMENTATION
- **`docs/modules/SKATES.md`** — All IMPL items resolved; unresolved items section cleared; status updated
- **`docs/PROJECT_STATE.md`** — Version 2.4: current phase updated to READY FOR IMPLEMENTATION; all four IMPL rows updated to RESOLVED; blocked work cleared

### Notes
- No application source code was modified.
- No database migrations were created.
- No tests were modified.
- Phase 03 implementation is now fully unblocked.

---

## [Phase 03 Pre-Implementation] — 2026-09-10 (Phase 03 Owner Decisions & Documentation Reconciliation)

### Added — Decisions
- **`docs/decisions/DECISION_LOG.md`** — DEC-030: Skate code is optional input — auto-generated when omitted; generation algorithm PENDING
- **`docs/decisions/DECISION_LOG.md`** — DEC-031: Admin API status transition matrix — `rented`/`reserved` blocked; `available↔maintenance/damaged/lost` permitted
- **`docs/decisions/DECISION_LOG.md`** — DEC-032: QR code and barcode auto-generated on create, user-editable; exact payload format PENDING
- **`docs/decisions/DECISION_LOG.md`** — DEC-033: Phase 03 uses temporary fixed Skate Type dropdown; Settings module deferred; initial values PENDING

### Updated — Documentation
- **`docs/phases/PHASE_03_SKATES_MODULE.md`** — Completely rewritten from stub to full phase specification: scope, business rules, status transition matrix (DEC-031), skate code behavior (DEC-030), QR/barcode policy (DEC-032), skate type policy (DEC-033), full API routes, DB design, 16 test cases, verification criteria, known risks, unresolved items (IMPL-001 to IMPL-004)
- **`docs/modules/SKATES.md`** — Completely rewritten from stub to full module reference: all business rules, transition table, frontend/backend/DB plan, API table, permissions table, known technical debt (TD-002, TD-003)
- **`docs/PROJECT_STATE.md`** — Version 2.3: current status updated to Phase 03 PRE-IMPLEMENTATION; IMPL-001 to IMPL-004 added to unknowns; TD-002, TD-003 added to technical debt; docs status updated
- **`docs/PROJECT_MAP.md`** — Version 1.4: Skates module paths updated to PLANNED; planned file tree added; decisions reference added; known risks updated

### Conflicts Resolved
- **TC-SK-02 (missing skate_code → 400)** — CORRECTED: missing `skate_code` triggers auto-generation → 201 (not 400) — per DEC-030
- **Status transition plan ambiguity** — RESOLVED: explicit admin-permitted and admin-forbidden transitions documented per DEC-031
- **QR/barcode "assumed to equal skate_code"** — CORRECTED: no assumption; format PENDING per DEC-032
- **Phase 03 createSkate() contradiction** — RESOLVED: `skate_code` optional; TC-SK-02 updated per DEC-030

### Remaining Unresolved (awaiting owner)
- **IMPL-001** — `skate_code` auto-generation algorithm (format, sequence, padding)
- **IMPL-002** — `qr_code` stored value format
- **IMPL-003** — `barcode` stored value format
- **IMPL-004** — Initial Skate Type values for Phase 03 fixed dropdown

### Technical Debt Added
- **TD-002** — DEC-007 enforcement deferred to Phase 09 (maintenance→available check)
- **TD-003** — Skate Type hardcoded in Phase 03; migration to Settings required

### Notes
- No application source code was modified in this release.
- No database migrations were created.
- No tests were modified.
- Phase 03 implementation blocked on IMPL-001 through IMPL-004 (awaiting owner confirmation).

---

## [0.3.1] — 2026-09-09 (Phase 02 Final Gate Verification & Reconciliation)

### Fixed
- **`apps/api/src/modules/auth/auth.service.ts`** — Added `jti` (UUID) to refresh token JWT payload; prevents `ER_DUP_ENTRY` when same user logs in multiple times within the same second (duplicate token hash collision)
- **`apps/api/src/db/seed.ts`** — Removed non-existent `payments.view` from Cashier `permissionKeys` (that key is not in Phase 02 permission set; it was silently filtered but left misleading); fixed comment from "39 keys" to "40 keys"

### Added
- **`apps/api/src/app.ts`** — App factory module (extracted from `index.ts`): configures Express, middleware, and routes without starting the HTTP listener. Required for test isolation.
- **`apps/api/src/tests/auth.test.ts`** — 14 integration test cases, 18 assertions: login success/failure, GET /me, refresh rotation, logout revocation, 401 (unauth), 403 (permission denied), deactivated user. All 18 PASS.
- **`apps/api/src/tests/setup.ts`** — Test setup file
- **`apps/api/vitest.config.ts`** — Vitest configuration (30s timeout, serial execution, dotenv)
- **`apps/api/src/modules/auth/auth.types.ts`** — Added `jti?` field to `TokenPayload`

### Modified
- **`apps/api/src/index.ts`** — Refactored to import app from `app.ts`; now only handles DB connection test + HTTP listener startup
- **`apps/api/package.json`** — Added `test` and `test:watch` scripts; added `dotenv-cli`, `cross-env`, `supertest`, `vitest` dev dependencies
- **`docs/phases/PHASE_02_AUTHENTICATION_AND_PERMISSIONS.md`** — Completely rewritten from stub to full spec: scope, all 14 API routes, DB schema, 40 permission keys table, full test matrix (14 TCs), DoD checklist, known risks
- **`docs/PROJECT_MAP.md`** — All Phase 02 files and modules updated from PLANNED → VERIFIED
- **`docs/PROJECT_STATE.md`** — Final Gate results: tests, builds, verification timestamp

### Verified (Final Gate)
- `npm test` → **18/18 PASS** (zero failures)
- `npm run build` (api) → **zero TypeScript errors**
- `npm run build` (web) → **zero TypeScript errors**
- Browser: login, protected routes, users page, roles page, logout — **all pass**
- Security: duplicate hash bug fixed, rotation enforced, revocation confirmed

---

## [0.3.0] — 2026-09-09 (Phase 02 — Authentication & Permissions)

### Added — Backend
- **`apps/api/src/db/schema/users.ts`** — Drizzle schema: `users`, `roles`, `permissions`, `user_roles`, `role_permissions` tables
- **`apps/api/src/db/schema/auth.ts`** — Drizzle schema: `refresh_tokens` table (single-use rotation, SHA-256 hash stored — DEC-025)
- **`apps/api/src/db/migrations/0000_*.sql`** — Migration 001: 6 tables created in `koshk_skate` DB
- **`apps/api/src/db/seed.ts`** — Idempotent seed: 40 permission keys, 3 system roles, default admin user (DEC-026)
- **`apps/api/src/modules/auth/auth.types.ts`** — Auth TypeScript types
- **`apps/api/src/modules/auth/auth.service.ts`** — login, refresh (with rotation), logout, verifyAccessToken, loadUserWithPermissions
- **`apps/api/src/modules/auth/auth.routes.ts`** — POST /login, POST /refresh, POST /logout, GET /me with HttpOnly cookie handling (DEC-025)
- **`apps/api/src/modules/users/users.types.ts`** — User/Role/Permission DTO types
- **`apps/api/src/modules/users/users.service.ts`** — User CRUD with bcrypt + soft deactivation
- **`apps/api/src/modules/users/users.routes.ts`** — GET/POST/PATCH/DELETE /users (permission-gated)
- **`apps/api/src/modules/users/roles.service.ts`** — Role CRUD + permission assignment (system roles protected)
- **`apps/api/src/modules/users/roles.routes.ts`** — GET/POST/PATCH/DELETE /roles + PUT /roles/:id/permissions
- **`apps/api/src/middleware/auth.ts`** — `authenticate()` — JWT Bearer token verification, req.user injection
- **`apps/api/src/middleware/permission.ts`** — `requirePermission(key)` — RBAC server-side enforcement, returns 403
- **`apps/api/src/middleware/rateLimiter.ts`** — `loginLimiter` — 10 req/min/IP (DEC-027), in-memory

### Added — Frontend
- **`apps/web/src/modules/auth/`** — auth.types.ts, auth.service.ts (login/refresh/logout/me API calls)
- **`apps/web/src/modules/auth/LoginPage.tsx`** — Arabic RTL login page, KOSHK SKATE design, loading state, Arabic error messages
- **`apps/web/src/modules/users/users.service.ts`** — Users/Roles API client wrappers
- **`apps/web/src/modules/users/UsersPage.tsx`** — User list + create modal + deactivate
- **`apps/web/src/modules/users/RolesPage.tsx`** — Role cards with permissions
- **`apps/web/src/contexts/AuthContext.tsx`** — In-memory token storage, silent refresh on mount, login/logout
- **`apps/web/src/hooks/usePermission.ts`** — `usePermission(key): boolean`
- **`apps/web/src/components/ProtectedRoute.tsx`** — Redirect to /login if not authenticated
- **`apps/web/src/components/PermissionGate.tsx`** — Render children only if user has permission

### Modified
- **`apps/api/src/index.ts`** — Added cookie-parser, mounted auth/users/roles routes, CORS credentials:true
- **`apps/api/src/config/env.ts`** — Added JWT_REFRESH_SECRET, token expiry vars, seed vars, production secret enforcement
- **`apps/api/src/utils/errors.ts`** — Added UnauthorizedError class
- **`apps/api/src/db/schema/index.ts`** — Exports Phase 02 tables
- **`apps/api/drizzle.config.ts`** — Schema array for drizzle-kit compatibility
- **`apps/api/package.json`** — Added db:seed script
- **`apps/api/.env.example`** — Added JWT_REFRESH_SECRET, token expiry, CORS, seed credential vars
- **`apps/web/src/main.tsx`** — Wrapped with BrowserRouter + AuthProvider
- **`apps/web/src/App.tsx`** — Full routing: /login (public) + protected app shell with NavLink sidebar
- **`apps/web/src/services/api.ts`** — Bearer token injection, 401 silent refresh retry, credentials:include

### Decisions Recorded
- DEC-025: Refresh token stored as HttpOnly cookie
- DEC-026: Seed admin credentials via env vars, idempotent
- DEC-027: In-memory rate limiter, 10 req/min/IP
- DEC-028: Separate JWT_SECRET / JWT_REFRESH_SECRET
- DEC-029: Password reset out of scope for Phase 02

### Dependencies Added
- Backend: `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `cookie-parser` + type definitions
- Frontend: `react-router-dom`

---

## [0.2.0] — 2026-09-09 (Phase 01 — Foundation & Project Setup)

### Added
- **Frontend scaffold** (`apps/web/`) — Vite + React + TypeScript initialized and building cleanly
- **`apps/web/index.html`** — Updated to `lang="ar" dir="rtl"`, Cairo font loaded via Google Fonts, proper meta description
- **`apps/web/src/styles/design-system.css`** — Complete KOSHK SKATE CSS token system (colors, typography, spacing, shadows, radii, z-index, transitions, layout variables)
- **`apps/web/src/styles/index.css`** — Global RTL reset, Cairo font applied, branded scrollbar, gold focus ring
- **`apps/web/src/App.tsx`** — Application shell (navy sidebar RTL-anchored + topbar + content area using design system tokens)
- **`apps/web/src/services/api.ts`** — Typed fetch-based API client base
- **`apps/web/.env.example`** — Frontend environment variable template
- **Backend scaffold** (`apps/api/`) — Express + TypeScript with dev/build scripts
- **`apps/api/src/index.ts`** — Express entry, CORS, JSON parsing, Morgan, `GET /api/v1/health`, 404 handler, global error handler
- **`apps/api/src/config/env.ts`** — Centralized environment config (no direct `process.env` access elsewhere)
- **`apps/api/src/middleware/errorHandler.ts`** — Global structured JSON error handler with dev/prod stack trace control
- **`apps/api/src/utils/errors.ts`** — 8 typed error classes (AppError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, BusinessRuleError, InternalError)
- **`apps/api/src/utils/financial.ts`** — Financial utilities (calculateLateFee, calculateExpectedEndTime, roundCurrency, formatCurrency)
- **`apps/api/src/db/connection.ts`** — Drizzle ORM + mysql2 pool with `testConnection()` (DEC-022)
- **`apps/api/src/db/schema/index.ts`** — Empty Drizzle schema anchor
- **`apps/api/drizzle.config.ts`** — Drizzle Kit config for migrations
- **`apps/api/.env.example`** — Backend environment variable template
- **`.gitignore`** (root) — Comprehensive exclusion rules covering both apps
- **`README.md`** (root) — Arabic README with tech stack, structure, and local setup

### Decisions Made
- **DEC-022** — ORM: Drizzle ORM with mysql2 driver (project owner approved)
- **DEC-023** — Arabic font: Cairo (Google Fonts) (project owner approved)

### Technical
- Frontend builds: ✅ zero TypeScript errors
- Backend: TypeScript strict mode, CommonJS output for Node.js/Hostinger compatibility
- Database: utf8mb4 charset enforced for Arabic text
- All monetary calculations use integer arithmetic (no floating-point)
- RTL enforced at HTML root level (`<html lang="ar" dir="rtl">`)

---

## [0.1.1] — 2026-09-09 (Documentation Reconciliation)

### Changed
- `docs/PROJECT_STATE.md` — Corrected Git remote from NONE to GitHub (`https://github.com/mohamedalihassanwork-cpu/Skate-system`); corrected branch from `main` to `master`; updated technology decisions to reflect approved stack; resolved UNK-001 and UNK-002
- `docs/PROJECT_MAP.md` — Added approved technology reference table; corrected `.js` paths to `.ts`; updated governance file tree
- `docs/decisions/DECISION_LOG.md` — Marked DEC-014 as SUPERSEDED; added DEC-019 (React+Vite+TypeScript), DEC-020 (Node.js+Express+TypeScript), DEC-021 (GitHub)
- `docs/architecture/TECHNICAL_ARCHITECTURE.md` — Updated tech stack from UNKNOWN/candidates to approved decisions; updated summary table
- `docs/architecture/FRONTEND_ARCHITECTURE.md` — Updated framework from candidates to approved React+Vite+TypeScript; updated state management to React options
- `docs/architecture/BACKEND_ARCHITECTURE.md` — Updated framework from candidates to approved Node.js+Express+TypeScript; updated all file paths from `.js` to `.ts`
- `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` — Added GitHub repository URL; corrected branch from `main` to `master`

### Added
- `docs/00-governance/AI_AGENT_WORKFLOW_AR.md` — New: Arabic operating guide for project owner (workflow, templates, governance rules in Arabic)

### Notes
- No application code was added or modified in this release.
- This is a documentation reconciliation only.
- Frontend and backend framework decisions are now APPROVED (DEC-019, DEC-020).
- ORM, authentication mechanism, and notification delivery remain PENDING.

---

## [0.1.0] — 2026-09-09

### Added
- Repository initialized with Git
- Master Business & Product Specification (`Skate_Rental_ERP_Master_Business_Product_Specification.md`)
- Visual Design Reference (`KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`)
- Complete governance documentation:
  - `docs/00-governance/AI_AGENT_RULES.md`
  - `docs/00-governance/SOURCE_OF_TRUTH.md`
  - `docs/00-governance/DEFINITION_OF_DONE.md`
  - `docs/00-governance/CHANGE_REQUEST_PROCESS.md`
  - `docs/00-governance/DOCUMENTATION_RULES.md`
- Complete architecture documentation (target/planned):
  - `docs/architecture/TECHNICAL_ARCHITECTURE.md`
  - `docs/architecture/DATABASE_ARCHITECTURE.md`
  - `docs/architecture/API_ARCHITECTURE.md`
  - `docs/architecture/FRONTEND_ARCHITECTURE.md`
  - `docs/architecture/BACKEND_ARCHITECTURE.md`
  - `docs/architecture/SECURITY_ARCHITECTURE.md`
  - `docs/architecture/DEPLOYMENT_ARCHITECTURE.md`
- Project navigation system:
  - `docs/PROJECT_MAP.md`
  - `docs/PROJECT_STATE.md`
- Decision log with 18 initial decisions (`docs/decisions/DECISION_LOG.md`)
- Module documentation stubs for all 21 modules (`docs/modules/`)
- Quality documentation:
  - `docs/quality/QA_STRATEGY.md`
  - `docs/quality/TEST_MATRIX.md` (62 test cases defined)
  - `docs/quality/VERIFICATION_RULES.md`
  - `docs/quality/REGRESSION_STRATEGY.md`
- Initial project audit (`docs/INITIAL_PROJECT_AUDIT.md`)

### Notes
- This is the documentation and governance initialization only.
- No application code exists.
- Technology stack decisions were recorded as pending at this stage (see DEC-014, now SUPERSEDED by DEC-019/020).

---

*Future entries will appear above as implementation progresses.*
